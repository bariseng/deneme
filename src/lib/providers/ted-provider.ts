// ─── TED API v3 Provider — EU Tender Data ───────────────────

import { prisma } from "@/lib/prisma";
import type { HealthCheckResult, ProviderConfig } from "./types";
import { PROVIDER_DEFAULTS } from "./types";
import { RateLimiter } from "./rate-limiter";
import { ProviderCache } from "./cache";
import { CircuitBreaker, withRetry } from "./error-handler";
import { convertToTry } from "./exchange-rate";

// ─── TED API Types ──────────────────────────────────────────

export interface TedSearchParams {
  query?: string;
  country?: string;
  cpvCodes?: string[];
  dateFrom?: string;
  dateTo?: string;
  noticeType?: string;
  minValue?: number;
  maxValue?: number;
  language?: string;
  page?: number;
  pageSize?: number;
}

interface TedNoticeRaw {
  "notice-id": string;
  title?: Record<string, string>;
  "publication-date"?: string;
  "submission-deadline"?: string;
  "notice-type"?: string;
  "buyer-name"?: Record<string, string>;
  "buyer-country"?: string;
  "buyer-city"?: string;
  "cpv-codes"?: string[];
  "estimated-value"?: { amount?: number; currency?: string };
  description?: Record<string, string>;
  "source-url"?: string;
}

interface TedSearchResponse {
  notices: TedNoticeRaw[];
  totalCount: number;
  page: number;
  pageSize: number;
}

// ─── Sector Mapping ─────────────────────────────────────────

const CPV_SECTOR_MAP: Record<string, string> = {
  "45": "Yapım", "03": "Tarım", "09": "Enerji", "15": "Gıda",
  "30": "BT Ekipman", "33": "Tıbbi Cihaz", "34": "Ulaşım",
  "42": "Sanayi Makine", "44": "Yapı Malzeme", "48": "Yazılım",
  "50": "Bakım Onarım", "55": "Otelcilik", "60": "Taşımacılık",
  "64": "Telekomünikasyon", "71": "Mühendislik", "72": "BT Hizmet",
  "79": "İş Hizmetleri", "85": "Sağlık", "90": "Çevre",
};

function cpvToSector(cpvCodes?: string[]): string {
  if (!cpvCodes || cpvCodes.length === 0) return "Genel";
  const prefix = cpvCodes[0].slice(0, 2);
  return CPV_SECTOR_MAP[prefix] ?? "Genel";
}

// ─── TED Headers ────────────────────────────────────────────

function getTedHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "IhalePro/1.0",
  };
  const apiKey = process.env.TED_API_KEY;
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }
  return headers;
}

// ─── Provider Config ────────────────────────────────────────

const TED_CONFIG: ProviderConfig = {
  name: "TED",
  baseUrl: process.env.TED_API_URL || "https://api.ted.europa.eu",
  rateLimitMs: PROVIDER_DEFAULTS.TED.rateLimitMs,
  maxTokens: PROVIDER_DEFAULTS.TED.maxTokens,
  cache: { ttl: 7200, staleWhileRevalidate: true, key: "ted" },
  maxRetries: 3,
  baseDelayMs: 500,
  circuitBreakerThreshold: PROVIDER_DEFAULTS.TED.circuitBreakerThreshold,
  circuitBreakerResetMs: PROVIDER_DEFAULTS.TED.circuitBreakerResetMs,
};

// ─── Target Countries ───────────────────────────────────────

export const TARGET_COUNTRIES = [
  { code: "IRQ", name: "Irak", nameTr: "Irak" },
  { code: "LBY", name: "Libya", nameTr: "Libya" },
  { code: "TKM", name: "Turkmenistan", nameTr: "Türkmenistan" },
  { code: "KAZ", name: "Kazakhstan", nameTr: "Kazakistan" },
  { code: "AZE", name: "Azerbaijan", nameTr: "Azerbaycan" },
  { code: "QAT", name: "Qatar", nameTr: "Katar" },
  { code: "SAU", name: "Saudi Arabia", nameTr: "Suudi Arabistan" },
  { code: "DZA", name: "Algeria", nameTr: "Cezayir" },
  { code: "DEU", name: "Germany", nameTr: "Almanya" },
  { code: "RUS", name: "Russia", nameTr: "Rusya" },
] as const;

// ─── TED Provider Class ────────────────────────────────────

export class TedProvider {
  private readonly config: ProviderConfig;
  private readonly rateLimiter: RateLimiter;
  private readonly cache: ProviderCache;
  private readonly circuitBreaker: CircuitBreaker;

  constructor(config: ProviderConfig = TED_CONFIG) {
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

  // ── Search Notices ────────────────────────────────────────

  async searchNotices(params: TedSearchParams): Promise<TedSearchResponse> {
    const query = this.buildExpertQuery(params);
    const cacheKey = `ted:search:${query}:${params.page ?? 1}`;

    const cached = await this.cache.get<TedSearchResponse>(cacheKey);
    if (cached) return cached;

    await this.rateLimiter.acquire();

    const searchParams = new URLSearchParams({
      q: query,
      page: String(params.page ?? 1),
      limit: String(params.pageSize ?? 50),
      sortField: "publication-date",
      sortOrder: "desc",
    });

    const result = await this.circuitBreaker.execute(() =>
      withRetry(
        () => this.getApi(`/v3/notices/search?${searchParams.toString()}`),
        { maxRetries: this.config.maxRetries, baseDelayMs: this.config.baseDelayMs },
      ),
    );

    const response = result as TedSearchResponse;
    await this.cache.set(cacheKey, response, this.config.cache, "TED");
    return response;
  }

  async getNoticeById(noticeId: string): Promise<TedNoticeRaw | null> {
    const cacheKey = `ted:notice:${noticeId}`;
    const cached = await this.cache.get<TedNoticeRaw>(cacheKey);
    if (cached) return cached;

    await this.rateLimiter.acquire();

    try {
      const result = await this.circuitBreaker.execute(() =>
        withRetry(
          () => this.getApi(`/v3/notices/${noticeId}`),
          { maxRetries: this.config.maxRetries, baseDelayMs: this.config.baseDelayMs },
        ),
      );
      const notice = result as TedNoticeRaw;
      await this.cache.set(
        cacheKey, notice,
        { ...this.config.cache, ttl: 86400 }, "TED",
      );
      return notice;
    } catch {
      return null;
    }
  }

  // ── Health Check ──────────────────────────────────────────

  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const res = await fetch(`${this.config.baseUrl}/v3/notices/search?q=*&limit=1`, {
        headers: getTedHeaders(),
        signal: AbortSignal.timeout(5000),
      });
      return { ok: res.ok, latencyMs: Date.now() - start };
    } catch {
      return { ok: false, latencyMs: Date.now() - start };
    }
  }

  // ── Mapping & Upsert ─────────────────────────────────────

  async mapToInternationalTender(raw: TedNoticeRaw) {
    const title = this.pickLang(raw.title, "EN") || "Untitled";
    const description = this.pickLang(raw.description, "EN") || "";
    const currency = raw["estimated-value"]?.currency || "EUR";
    const amount = raw["estimated-value"]?.amount;

    let estimatedBudgetTry: number | null = null;
    if (amount && amount > 0) {
      try {
        estimatedBudgetTry = await convertToTry(amount, currency);
      } catch {
        estimatedBudgetTry = null;
      }
    }

    return {
      externalId: raw["notice-id"],
      title,
      titleTr: this.pickLang(raw.title, "TR") || null,
      country: raw["buyer-country"] || "EU",
      city: raw["buyer-city"] || null,
      sector: cpvToSector(raw["cpv-codes"]),
      estimatedBudget: amount ?? null,
      estimatedBudgetTry,
      currency,
      description,
      descriptionTr: this.pickLang(raw.description, "TR") || null,
      applicationDeadline: raw["submission-deadline"]
        ? new Date(raw["submission-deadline"])
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      sourceUrl: raw["source-url"]
        || `https://ted.europa.eu/en/notice/-/${raw["notice-id"]}`,
      sourcePlatform: "TED",
      cpvCodes: raw["cpv-codes"]
        ? JSON.parse(JSON.stringify(raw["cpv-codes"]))
        : null,
      buyerName: this.pickLang(raw["buyer-name"], "EN") || null,
      buyerCountry: raw["buyer-country"] || null,
      noticeType: raw["notice-type"] || null,
      languageCode: "EN",
      status: this.mapStatus(raw),
    };
  }

  async upsertNotice(raw: TedNoticeRaw): Promise<string> {
    const data = await this.mapToInternationalTender(raw);
    const result = await prisma.internationalTender.upsert({
      where: { externalId: data.externalId },
      update: {
        title: data.title,
        titleTr: data.titleTr,
        country: data.country,
        city: data.city,
        sector: data.sector,
        estimatedBudget: data.estimatedBudget,
        estimatedBudgetTry: data.estimatedBudgetTry,
        currency: data.currency,
        description: data.description,
        descriptionTr: data.descriptionTr,
        applicationDeadline: data.applicationDeadline,
        cpvCodes: data.cpvCodes,
        buyerName: data.buyerName,
        buyerCountry: data.buyerCountry,
        noticeType: data.noticeType,
        status: data.status,
      },
      create: data,
      select: { id: true },
    });
    return result.id;
  }

  async batchUpsert(notices: TedNoticeRaw[]): Promise<{
    inserted: number; updated: number; errors: number;
  }> {
    let inserted = 0, updated = 0, errors = 0;

    const ids = notices.map((n) => n["notice-id"]).filter(Boolean);
    const existing = await prisma.internationalTender.findMany({
      where: { externalId: { in: ids } },
      select: { externalId: true },
    });
    const existingSet = new Set(existing.map((e) => e.externalId));

    for (const raw of notices) {
      try {
        await this.upsertNotice(raw);
        if (existingSet.has(raw["notice-id"])) {
          updated++;
        } else {
          inserted++;
        }
      } catch {
        errors++;
      }
    }

    return { inserted, updated, errors };
  }

  // ── Sync Logging ──────────────────────────────────────────

  async logSync(operation: string, fn: () => Promise<number>) {
    const startedAt = new Date();
    const log = await prisma.dataSyncLog.create({
      data: { provider: "TED", operation, status: "RUNNING", startedAt },
    });

    try {
      const recordCount = await fn();
      await prisma.dataSyncLog.update({
        where: { id: log.id },
        data: { status: "COMPLETED", recordCount, completedAt: new Date() },
      });
      return { status: "COMPLETED" as const, recordCount };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await prisma.dataSyncLog.update({
        where: { id: log.id },
        data: { status: "FAILED", errorMessage, completedAt: new Date() },
      });
      return { status: "FAILED" as const, recordCount: 0, errorMessage };
    }
  }

  // ── Private Helpers ───────────────────────────────────────

  private buildExpertQuery(params: TedSearchParams): string {
    const parts: string[] = [];

    if (params.query) parts.push(params.query);
    if (params.country) parts.push(`buyer-country:${params.country}`);
    if (params.noticeType) parts.push(`notice-type:${params.noticeType}`);
    if (params.dateFrom) parts.push(`publication-date>=${params.dateFrom}`);
    if (params.dateTo) parts.push(`publication-date<=${params.dateTo}`);
    if (params.cpvCodes && params.cpvCodes.length > 0) {
      parts.push(`cpv-code:(${params.cpvCodes.join(" OR ")})`);
    }
    if (params.minValue) parts.push(`estimated-value>=${params.minValue}`);
    if (params.maxValue) parts.push(`estimated-value<=${params.maxValue}`);

    return parts.length > 0 ? parts.join(" AND ") : "*";
  }

  private async getApi(path: string): Promise<unknown> {
    const url = `${this.config.baseUrl}${path}`;
    const res = await fetch(url, {
      headers: getTedHeaders(),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      throw new Error(`TED API error: ${res.status} ${res.statusText}`);
    }
    return res.json();
  }

  private pickLang(
    field?: Record<string, string>,
    lang: string = "EN",
  ): string | null {
    if (!field) return null;
    return field[lang] || field["EN"] || Object.values(field)[0] || null;
  }

  private mapStatus(raw: TedNoticeRaw): "OPEN" | "CLOSING_SOON" | "CLOSED" | "AWARDED" {
    const deadline = raw["submission-deadline"];
    if (!deadline) return "OPEN";
    const dl = new Date(deadline);
    const now = new Date();
    const daysLeft = (dl.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (daysLeft < 0) return "CLOSED";
    if (daysLeft < 7) return "CLOSING_SOON";
    return "OPEN";
  }
}

// ─── Singleton ──────────────────────────────────────────────

const globalForTed = globalThis as unknown as { tedProvider?: TedProvider };
export const tedProvider = globalForTed.tedProvider ?? new TedProvider();
if (process.env.NODE_ENV !== "production") {
  globalForTed.tedProvider = tedProvider;
}
