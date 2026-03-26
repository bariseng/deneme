// ─── MERSİS (Merkezi Sicil Kayıt Sistemi) Provider ──────────

import { prisma } from "@/lib/prisma";
import { RateLimiter } from "./rate-limiter";
import { ProviderCache } from "./cache";
import { CircuitBreaker, withRetry } from "./error-handler";
import type { ProviderConfig, HealthCheckResult } from "./types";

// ─── Types ──────────────────────────────────────────────────

export interface MersisCompanyData {
  mersisNo: string;
  title: string;
  vkn: string;
  taxOffice: string;
  foundedDate: string;
  status: string;
  companyType: string;
  capital: number;
  address: string;
  city: string;
  tradeRegNo: string;
  boardMembers: string[];
}

interface MersisApiResponse {
  sonuc?: {
    mersisNo?: string;
    unvan?: string;
    vkn?: string;
    vergeDairesi?: string;
    kurulusTarihi?: string;
    durum?: string;
    turpicindeturkod?: string;
    sermaye?: number;
    adres?: string;
    il?: string;
    ticSicNo?: string;
    yonetimKurulu?: string[];
  };
}

interface OpenCorporatesCompany {
  name: string;
  company_number: string;
  jurisdiction_code: string;
  registered_address_in_full: string | null;
  incorporation_date: string | null;
  company_type: string | null;
  current_status: string | null;
}

interface OpenCorporatesSearchResponse {
  results?: {
    companies?: Array<{
      company: OpenCorporatesCompany;
    }>;
  };
}

// ─── Provider Configuration ─────────────────────────────────

const MERSIS_CONFIG: ProviderConfig = {
  name: "MERSIS",
  baseUrl: "https://mersis.gtb.gov.tr",
  rateLimitMs: 1500,
  maxTokens: 3,
  cache: { ttl: 604800, staleWhileRevalidate: true, key: "mersis" }, // 7 days
  maxRetries: 2,
  baseDelayMs: 1000,
  circuitBreakerThreshold: 5,
  circuitBreakerResetMs: 60_000,
};

const OPENCORPORATES_BASE = "https://api.opencorporates.com/v0.4";

// ─── Provider Class ─────────────────────────────────────────

class MersisProvider {
  private readonly rateLimiter: RateLimiter;
  private readonly cache: ProviderCache;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly config: ProviderConfig;

  constructor() {
    this.config = MERSIS_CONFIG;
    this.rateLimiter = new RateLimiter({
      maxTokens: this.config.maxTokens,
      refillIntervalMs: this.config.rateLimitMs,
      tokensPerInterval: 1,
    });
    this.cache = new ProviderCache();
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: this.config.circuitBreakerThreshold,
      resetTimeoutMs: this.config.circuitBreakerResetMs,
      cache: this.cache,
    });
  }

  // ─── Search by MERSİS Number ────────────────────────────

  async searchByMersisNo(mersisNo: string): Promise<MersisCompanyData | null> {
    if (!/^\d{16}$/.test(mersisNo)) {
      return null;
    }

    const cacheKey = `mersis:no:${mersisNo}`;
    const cached = await this.cache.get<MersisCompanyData>(cacheKey);
    if (cached) return cached;

    await this.rateLimiter.acquire();

    const result = await this.circuitBreaker.execute(() =>
      withRetry(() => this.fetchByMersisNo(mersisNo), {
        maxRetries: this.config.maxRetries,
        baseDelayMs: this.config.baseDelayMs,
      }),
    );

    if (result) {
      await this.cache.set(cacheKey, result, this.config.cache, this.config.name);
    }

    return result;
  }

  private async fetchByMersisNo(mersisNo: string): Promise<MersisCompanyData | null> {
    // Try the MERSİS internal JSON endpoint first
    try {
      const response = await fetch(
        `${this.config.baseUrl}/irsaliye/api/v1/companies/${mersisNo}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ mersisNo }),
          signal: AbortSignal.timeout(10_000),
        },
      );

      if (response.ok) {
        const data: unknown = await response.json();
        const parsed = this.parseMersisResponse(data);
        if (parsed) return parsed;
      }
    } catch {
      // MERSİS endpoint unavailable, fall through to OpenCorporates
    }

    return null;
  }

  private parseMersisResponse(data: unknown): MersisCompanyData | null {
    if (!data || typeof data !== "object") return null;

    const typed = data as MersisApiResponse;
    const s = typed.sonuc;
    if (!s || !s.mersisNo || !s.unvan) return null;

    return {
      mersisNo: s.mersisNo,
      title: s.unvan,
      vkn: s.vkn ?? "",
      taxOffice: s.vergeDairesi ?? "",
      foundedDate: s.kurulusTarihi ?? "",
      status: s.durum ?? "UNKNOWN",
      companyType: s.turpicindeturkod ?? "",
      capital: s.sermaye ?? 0,
      address: s.adres ?? "",
      city: s.il ?? "",
      tradeRegNo: s.ticSicNo ?? "",
      boardMembers: s.yonetimKurulu ?? [],
    };
  }

  // ─── Search by Name (Hybrid) ─────────────────────────────

  async searchByName(name: string): Promise<MersisCompanyData[]> {
    const trimmed = name.trim();
    if (!trimmed) return [];

    const cacheKey = `mersis:name:${trimmed.toLowerCase()}`;
    const cached = await this.cache.get<MersisCompanyData[]>(cacheKey);
    if (cached) return cached;

    await this.rateLimiter.acquire();

    const results = await this.circuitBreaker.execute(() =>
      withRetry(() => this.fetchByName(trimmed), {
        maxRetries: this.config.maxRetries,
        baseDelayMs: this.config.baseDelayMs,
      }),
    );

    if (results.length > 0) {
      await this.cache.set(cacheKey, results, this.config.cache, this.config.name);
    }

    return results;
  }

  private async fetchByName(name: string): Promise<MersisCompanyData[]> {
    // Try MERSİS internal search first
    try {
      const response = await fetch(
        `${this.config.baseUrl}/irsaliye/api/v1/companies/search`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ unvan: name }),
          signal: AbortSignal.timeout(10_000),
        },
      );

      if (response.ok) {
        const data: unknown = await response.json();
        if (Array.isArray(data)) {
          const parsed = data
            .map((item: unknown) => this.parseMersisResponse(item))
            .filter((r): r is MersisCompanyData => r !== null);
          if (parsed.length > 0) return parsed;
        }
      }
    } catch {
      // MERSİS unavailable, fall through
    }

    // Fallback: OpenCorporates API
    return this.searchOpenCorporates(name);
  }

  private async searchOpenCorporates(name: string): Promise<MersisCompanyData[]> {
    const url = `${OPENCORPORATES_BASE}/companies/search?q=${encodeURIComponent(name)}&jurisdiction_code=tr`;

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      throw new Error(`OpenCorporates API returned status ${response.status}`);
    }

    const data: unknown = await response.json();
    const typed = data as OpenCorporatesSearchResponse;
    const companies = typed.results?.companies;

    if (!companies || companies.length === 0) return [];

    return companies.map((entry) => this.mapOpenCorporatesCompany(entry.company));
  }

  private mapOpenCorporatesCompany(oc: OpenCorporatesCompany): MersisCompanyData {
    return {
      mersisNo: oc.company_number ?? "",
      title: oc.name,
      vkn: "",
      taxOffice: "",
      foundedDate: oc.incorporation_date ?? "",
      status: oc.current_status ?? "UNKNOWN",
      companyType: oc.company_type ?? "",
      capital: 0,
      address: oc.registered_address_in_full ?? "",
      city: this.extractCity(oc.registered_address_in_full),
      tradeRegNo: "",
      boardMembers: [],
    };
  }

  private extractCity(address: string | null): string {
    if (!address) return "";
    // Turkish addresses typically end with the city name
    const parts = address.split(",").map((p) => p.trim());
    return parts.length > 0 ? parts[parts.length - 1] : "";
  }

  // ─── Sync Company from MERSİS to DB ──────────────────────

  async syncCompanyFromMersis(companyId: string, mersisNo: string): Promise<void> {
    const data = await this.searchByMersisNo(mersisNo);
    if (!data) {
      throw new Error(`No MERSİS data found for mersisNo: ${mersisNo}`);
    }

    await prisma.company.update({
      where: { id: companyId },
      data: {
        externalMersisId: data.mersisNo,
        mersisData: JSON.parse(JSON.stringify(data)),
        name: data.title,
        taxNumber: data.vkn || undefined,
        companyType: data.companyType || undefined,
        capitalAmount: data.capital > 0 ? data.capital : undefined,
        tradeRegNo: data.tradeRegNo || undefined,
        foundedYear: data.foundedDate
          ? new Date(data.foundedDate).getFullYear()
          : undefined,
        city: data.city || undefined,
        address: data.address || undefined,
        sector: undefined, // MERSİS does not provide sector info
      },
    });
  }

  // ─── Health Check ─────────────────────────────────────────

  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const res = await fetch(this.config.baseUrl, {
        method: "HEAD",
        signal: AbortSignal.timeout(5_000),
      });
      return { ok: res.ok, latencyMs: Date.now() - start };
    } catch {
      return { ok: false, latencyMs: Date.now() - start };
    }
  }
}

// ─── Singleton & Exports ────────────────────────────────────

const mersisProviderInstance = new MersisProvider();

export const mersisProvider = mersisProviderInstance;

export const searchByMersisNo = (mersisNo: string) =>
  mersisProviderInstance.searchByMersisNo(mersisNo);

export const searchByName = (name: string) =>
  mersisProviderInstance.searchByName(name);

export const syncCompanyFromMersis = (companyId: string, mersisNo: string) =>
  mersisProviderInstance.syncCompanyFromMersis(companyId, mersisNo);
