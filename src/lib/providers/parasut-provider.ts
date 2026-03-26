// ─── Paraşüt (Accounting SaaS) Provider with OAuth 2.0 ──────

import { prisma } from "@/lib/prisma";
import type { HealthCheckResult, ProviderConfig } from "./types";
import { RateLimiter } from "./rate-limiter";
import { ProviderCache } from "./cache";
import { CircuitBreaker, withRetry } from "./error-handler";

// ─── Paraşüt Types ─────────────────────────────────────────

export interface ParasutTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface ParasutInvoiceSummary {
  totalRevenue: number;
  totalExpenses: number;
  outstandingReceivables: number;
  outstandingPayables: number;
  invoiceCount: number;
}

export interface ParasutContact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  taxNumber: string | null;
  contactType: "customer" | "supplier";
  balance: number;
}

// ─── JSON:API response shapes (internal) ────────────────────

interface JsonApiResource {
  id: string;
  type: string;
  attributes: Record<string, unknown>;
}

interface JsonApiResponse {
  data: JsonApiResource | JsonApiResource[];
  meta?: { total_count?: number; page_count?: number };
}

interface OAuthTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  created_at: number;
}

// ─── Provider Config ────────────────────────────────────────

const PARASUT_CONFIG: ProviderConfig = {
  name: "PARASUT",
  baseUrl: "https://api.parasut.com/v4",
  rateLimitMs: 500,
  maxTokens: 5,
  cache: { ttl: 3600, staleWhileRevalidate: true, key: "parasut" },
  maxRetries: 3,
  baseDelayMs: 1000,
  circuitBreakerThreshold: 5,
  circuitBreakerResetMs: 60_000,
};

const TOKEN_URL = "https://api.parasut.com/oauth/token";
const AUTH_URL = "https://api.parasut.com/oauth/authorize";

// ─── Paraşüt Provider Class ────────────────────────────────

export class ParasutProvider {
  private readonly config: ProviderConfig;
  private readonly rateLimiter: RateLimiter;
  private readonly cache: ProviderCache;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(config: ProviderConfig = PARASUT_CONFIG) {
    this.config = config;
    this.clientId = process.env.PARASUT_CLIENT_ID ?? "";
    this.clientSecret = process.env.PARASUT_CLIENT_SECRET ?? "";
    this.rateLimiter = new RateLimiter({
      maxTokens: config.maxTokens ?? 1,
      refillIntervalMs: config.rateLimitMs,
      tokensPerInterval: 1,
    });
    this.cache = new ProviderCache();
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: config.circuitBreakerThreshold ?? 5,
      resetTimeoutMs: config.circuitBreakerResetMs ?? 60000,
      cache: this.cache,
    });
  }

  // ── OAuth Methods ───────────────────────────────────────

  getAuthUrl(redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
    });
    return `${AUTH_URL}?${params.toString()}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<ParasutTokens> {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code,
      redirect_uri: redirectUri,
    });

    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      throw new Error(`Paraşüt token exchange failed: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as OAuthTokenResponse;
    return this.mapTokenResponse(data);
  }

  async refreshTokens(refreshToken: string): Promise<ParasutTokens> {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: refreshToken,
    });

    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      throw new Error(`Paraşüt token refresh failed: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as OAuthTokenResponse;
    return this.mapTokenResponse(data);
  }

  // ── Data Methods ────────────────────────────────────────

  async getInvoiceSummary(companyId: string): Promise<ParasutInvoiceSummary> {
    const cacheKey = `parasut:invoice-summary:${companyId}`;
    const cached = await this.cache.get<ParasutInvoiceSummary>(cacheKey);
    if (cached) return cached;

    const token = await this.getValidToken(companyId);
    const connection = await prisma.parasutConnection.findUnique({
      where: { companyId },
      select: { parasutCompanyId: true },
    });

    if (!connection) {
      throw new Error(`No Paraşüt connection found for company ${companyId}`);
    }

    const parasutId = connection.parasutCompanyId;
    await this.rateLimiter.acquire();

    const [salesData, purchaseData] = await Promise.all([
      this.circuitBreaker.execute(() =>
        withRetry(
          () => this.apiGet(`/${parasutId}/sales_invoices`, token),
          { maxRetries: this.config.maxRetries, baseDelayMs: this.config.baseDelayMs ?? 1000 },
        ),
      ),
      this.circuitBreaker.execute(() =>
        withRetry(
          () => this.apiGet(`/${parasutId}/purchase_bills`, token),
          { maxRetries: this.config.maxRetries, baseDelayMs: this.config.baseDelayMs ?? 1000 },
        ),
      ),
    ]);

    const salesResponse = salesData as JsonApiResponse;
    const purchaseResponse = purchaseData as JsonApiResponse;

    const salesItems = Array.isArray(salesResponse.data) ? salesResponse.data : [];
    const purchaseItems = Array.isArray(purchaseResponse.data) ? purchaseResponse.data : [];

    let totalRevenue = 0;
    let outstandingReceivables = 0;
    for (const item of salesItems) {
      const netTotal = Number(item.attributes.net_total) || 0;
      const remaining = Number(item.attributes.remaining) || 0;
      totalRevenue += netTotal;
      outstandingReceivables += remaining;
    }

    let totalExpenses = 0;
    let outstandingPayables = 0;
    for (const item of purchaseItems) {
      const netTotal = Number(item.attributes.net_total) || 0;
      const remaining = Number(item.attributes.remaining) || 0;
      totalExpenses += netTotal;
      outstandingPayables += remaining;
    }

    const summary: ParasutInvoiceSummary = {
      totalRevenue,
      totalExpenses,
      outstandingReceivables,
      outstandingPayables,
      invoiceCount: salesItems.length + purchaseItems.length,
    };

    await this.cache.set(cacheKey, summary, this.config.cache, "PARASUT");
    return summary;
  }

  async getContacts(companyId: string, page = 1): Promise<ParasutContact[]> {
    const cacheKey = `parasut:contacts:${companyId}:page:${page}`;
    const cached = await this.cache.get<ParasutContact[]>(cacheKey);
    if (cached) return cached;

    const token = await this.getValidToken(companyId);
    const connection = await prisma.parasutConnection.findUnique({
      where: { companyId },
      select: { parasutCompanyId: true },
    });

    if (!connection) {
      throw new Error(`No Paraşüt connection found for company ${companyId}`);
    }

    const parasutId = connection.parasutCompanyId;
    await this.rateLimiter.acquire();

    const result = await this.circuitBreaker.execute(() =>
      withRetry(
        () => this.apiGet(`/${parasutId}/contacts?page[number]=${page}`, token),
        { maxRetries: this.config.maxRetries, baseDelayMs: this.config.baseDelayMs ?? 1000 },
      ),
    );

    const response = result as JsonApiResponse;
    const items = Array.isArray(response.data) ? response.data : [];

    const contacts: ParasutContact[] = items.map((item) => ({
      id: item.id,
      name: String(item.attributes.name ?? ""),
      email: item.attributes.email ? String(item.attributes.email) : null,
      phone: item.attributes.phone ? String(item.attributes.phone) : null,
      taxNumber: item.attributes.tax_number ? String(item.attributes.tax_number) : null,
      contactType: item.attributes.contact_type === "supplier" ? "supplier" as const : "customer" as const,
      balance: Number(item.attributes.balance) || 0,
    }));

    await this.cache.set(cacheKey, contacts, this.config.cache, "PARASUT");
    return contacts;
  }

  async syncFinancials(companyId: string): Promise<void> {
    const summary = await this.getInvoiceSummary(companyId);

    await prisma.parasutConnection.update({
      where: { companyId },
      data: {
        lastSyncAt: new Date(),
      },
    });

    // Invalidate cached summary so next read fetches fresh data
    await this.cache.invalidateAll();

    // Store sync result in data sync log
    await prisma.dataSyncLog.create({
      data: {
        provider: "PARASUT",
        operation: "syncFinancials",
        status: "COMPLETED",
        recordCount: summary.invoiceCount,
        startedAt: new Date(),
        completedAt: new Date(),
      },
    });
  }

  // ── Health Check ────────────────────────────────────────

  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const res = await fetch("https://api.parasut.com", {
        method: "HEAD",
        signal: AbortSignal.timeout(5000),
      });
      return { ok: res.ok, latencyMs: Date.now() - start };
    } catch {
      return { ok: false, latencyMs: Date.now() - start };
    }
  }

  // ── Internal Token Management ───────────────────────────

  private async getValidToken(companyId: string): Promise<string> {
    const connection = await prisma.parasutConnection.findUnique({
      where: { companyId },
      select: {
        accessToken: true,
        refreshToken: true,
        tokenExpiresAt: true,
        isActive: true,
      },
    });

    if (!connection || !connection.isActive) {
      throw new Error(`No active Paraşüt connection for company ${companyId}`);
    }

    const now = new Date();
    const bufferMs = 60_000; // refresh 1 minute before expiry
    const expiresAt = connection.tokenExpiresAt;

    if (expiresAt && expiresAt.getTime() - bufferMs > now.getTime()) {
      return connection.accessToken;
    }

    // Token expired or about to expire — refresh it
    const newTokens = await this.refreshTokens(connection.refreshToken);

    await prisma.parasutConnection.update({
      where: { companyId },
      data: {
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
        tokenExpiresAt: newTokens.expiresAt,
      },
    });

    return newTokens.accessToken;
  }

  // ── Private Helpers ─────────────────────────────────────

  private mapTokenResponse(data: OAuthTokenResponse): ParasutTokens {
    const expiresAt = new Date((data.created_at + data.expires_in) * 1000);
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt,
    };
  }

  private async apiGet(path: string, token: string): Promise<unknown> {
    const url = `${this.config.baseUrl}${path}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      throw new Error(`Paraşüt API error: ${res.status} ${res.statusText}`);
    }

    return res.json();
  }
}

// ─── Singleton Instance ─────────────────────────────────────

const globalForParasut = globalThis as unknown as { parasutProvider?: ParasutProvider };
export const parasutProvider =
  globalForParasut.parasutProvider ?? new ParasutProvider();
if (process.env.NODE_ENV !== "production") {
  globalForParasut.parasutProvider = parasutProvider;
}
