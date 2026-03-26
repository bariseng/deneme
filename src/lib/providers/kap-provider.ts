// ─── KAP (Kamuyu Aydınlatma Platformu) Provider ─────────────

import type { HealthCheckResult, ProviderConfig } from "./types";
import { RateLimiter } from "./rate-limiter";
import { ProviderCache } from "./cache";
import { CircuitBreaker, withRetry } from "./error-handler";

// ─── KAP Types ──────────────────────────────────────────────

export interface KapCompanyInfo {
  id: string;
  name: string;
  ticker: string;
  sector: string;
  subsector: string;
  city: string;
  listingDate: string;
  marketCap: number;
}

export interface KapFinancialData {
  period: string;
  totalAssets: number;
  totalLiabilities: number;
  equity: number;
  revenue: number;
  netIncome: number;
  ebitda: number;
}

export interface KapFinancialRatios {
  currentRatio: number;
  debtToEquity: number;
  netProfitMargin: number;
  returnOnEquity: number;
  returnOnAssets: number;
}

export interface KapDisclosure {
  id: string;
  companyId: string;
  title: string;
  type: string;
  publishedAt: string;
  summary: string;
}

// ─── Response Types (internal) ──────────────────────────────

interface KapSearchResponse {
  id: string;
  name: string;
  ticker: string;
  sector: string;
  subSector: string;
  city: string;
  listingDate: string;
  marketCap: number;
}

interface KapFinancialResponse {
  period: string;
  totalAssets: number;
  totalLiabilities: number;
  equity: number;
  revenue: number;
  netIncome: number;
  ebitda: number;
}

interface KapDisclosureResponse {
  id: string;
  companyId: string;
  title: string;
  type: string;
  publishedAt: string;
  summary: string;
}

// ─── Provider Config ────────────────────────────────────────

const KAP_CONFIG: ProviderConfig = {
  name: "KAP",
  baseUrl: "https://www.kap.org.tr",
  rateLimitMs: 1000,
  maxTokens: 3,
  cache: { ttl: 21600, staleWhileRevalidate: true, key: "kap" },
  maxRetries: 3,
  baseDelayMs: 1000,
  circuitBreakerThreshold: 5,
  circuitBreakerResetMs: 60_000,
};

const CACHE_TTL_COMPANY_INFO = 86400; // 24 hours
const CACHE_TTL_FINANCIAL = 21600; // 6 hours
const CACHE_TTL_DISCLOSURES = 21600; // 6 hours

const KAP_HEADERS: Record<string, string> = {
  Accept: "application/json",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};

// ─── KAP Provider Class ────────────────────────────────────

export class KapProvider {
  private readonly config: ProviderConfig;
  private readonly rateLimiter: RateLimiter;
  private readonly cache: ProviderCache;
  private readonly circuitBreaker: CircuitBreaker;

  constructor(config: ProviderConfig = KAP_CONFIG) {
    this.config = config;
    this.rateLimiter = new RateLimiter({
      maxTokens: config.maxTokens,
      refillIntervalMs: config.rateLimitMs,
      tokensPerInterval: 1,
    });
    this.cache = new ProviderCache();
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: config.circuitBreakerThreshold,
      resetTimeoutMs: config.circuitBreakerResetMs,
      cache: this.cache,
    });
  }

  // ── Public API Methods ──────────────────────────────────

  async searchCompany(name: string): Promise<KapCompanyInfo[]> {
    const cacheKey = `kap:company:search:${name.toLowerCase()}`;
    const cached = await this.cache.get<KapCompanyInfo[]>(cacheKey);
    if (cached) return cached;

    await this.rateLimiter.acquire();

    const result = await this.circuitBreaker.execute(() =>
      withRetry(
        () => this.getApi(`/en/api/company/search?q=${encodeURIComponent(name)}`),
        { maxRetries: this.config.maxRetries, baseDelayMs: this.config.baseDelayMs },
      ),
    );

    const raw = result as KapSearchResponse[];
    const companies: KapCompanyInfo[] = raw.map((item) => ({
      id: item.id,
      name: item.name,
      ticker: item.ticker,
      sector: item.sector,
      subsector: item.subSector,
      city: item.city,
      listingDate: item.listingDate,
      marketCap: item.marketCap,
    }));

    await this.cache.set(
      cacheKey,
      companies,
      { ...this.config.cache, ttl: CACHE_TTL_COMPANY_INFO },
      "KAP",
    );
    return companies;
  }

  async getFinancials(companyId: string): Promise<KapFinancialData[]> {
    const cacheKey = `kap:financials:${companyId}`;
    const cached = await this.cache.get<KapFinancialData[]>(cacheKey);
    if (cached) return cached;

    await this.rateLimiter.acquire();

    const result = await this.circuitBreaker.execute(() =>
      withRetry(
        () => this.getApi(`/en/api/company/${encodeURIComponent(companyId)}/financial-data`),
        { maxRetries: this.config.maxRetries, baseDelayMs: this.config.baseDelayMs },
      ),
    );

    const raw = result as KapFinancialResponse[];
    const financials: KapFinancialData[] = raw.map((item) => ({
      period: item.period,
      totalAssets: item.totalAssets,
      totalLiabilities: item.totalLiabilities,
      equity: item.equity,
      revenue: item.revenue,
      netIncome: item.netIncome,
      ebitda: item.ebitda,
    }));

    await this.cache.set(
      cacheKey,
      financials,
      { ...this.config.cache, ttl: CACHE_TTL_FINANCIAL },
      "KAP",
    );
    return financials;
  }

  async getDisclosures(companyId: string, limit = 20): Promise<KapDisclosure[]> {
    const cacheKey = `kap:disclosures:${companyId}:${limit}`;
    const cached = await this.cache.get<KapDisclosure[]>(cacheKey);
    if (cached) return cached;

    await this.rateLimiter.acquire();

    const result = await this.circuitBreaker.execute(() =>
      withRetry(
        () => this.getApi(`/en/api/company/${encodeURIComponent(companyId)}/disclosures`),
        { maxRetries: this.config.maxRetries, baseDelayMs: this.config.baseDelayMs },
      ),
    );

    const raw = result as KapDisclosureResponse[];
    const disclosures: KapDisclosure[] = raw.slice(0, limit).map((item) => ({
      id: item.id,
      companyId: item.companyId,
      title: item.title,
      type: item.type,
      publishedAt: item.publishedAt,
      summary: item.summary,
    }));

    await this.cache.set(
      cacheKey,
      disclosures,
      { ...this.config.cache, ttl: CACHE_TTL_DISCLOSURES },
      "KAP",
    );
    return disclosures;
  }

  /**
   * Pure calculation function — derives financial ratios from a single period's data.
   */
  calculateRatios(financials: KapFinancialData): KapFinancialRatios {
    const { totalAssets, totalLiabilities, equity, revenue, netIncome } = financials;

    const currentRatio = totalLiabilities !== 0
      ? totalAssets / totalLiabilities
      : 0;
    const debtToEquity = equity !== 0
      ? totalLiabilities / equity
      : 0;
    const netProfitMargin = revenue !== 0
      ? netIncome / revenue
      : 0;
    const returnOnEquity = equity !== 0
      ? netIncome / equity
      : 0;
    const returnOnAssets = totalAssets !== 0
      ? netIncome / totalAssets
      : 0;

    return {
      currentRatio: Math.round(currentRatio * 10000) / 10000,
      debtToEquity: Math.round(debtToEquity * 10000) / 10000,
      netProfitMargin: Math.round(netProfitMargin * 10000) / 10000,
      returnOnEquity: Math.round(returnOnEquity * 10000) / 10000,
      returnOnAssets: Math.round(returnOnAssets * 10000) / 10000,
    };
  }

  // ── Health Check ────────────────────────────────────────

  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const res = await fetch(this.config.baseUrl, {
        method: "HEAD",
        signal: AbortSignal.timeout(5000),
      });
      return { ok: res.ok, latencyMs: Date.now() - start };
    } catch {
      return { ok: false, latencyMs: Date.now() - start };
    }
  }

  // ── Private Helpers ─────────────────────────────────────

  private async getApi(path: string): Promise<unknown> {
    const url = `${this.config.baseUrl}${path}`;
    const res = await fetch(url, {
      method: "GET",
      headers: KAP_HEADERS,
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      throw new Error(`KAP API error: ${res.status} ${res.statusText}`);
    }

    return res.json();
  }
}

// ─── Singleton Instance ─────────────────────────────────────

const globalForKap = globalThis as unknown as { kapProvider?: KapProvider };
export const kapProvider =
  globalForKap.kapProvider ?? new KapProvider();
if (process.env.NODE_ENV !== "production") {
  globalForKap.kapProvider = kapProvider;
}
