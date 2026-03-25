// ─── EKAP v2 JSON API Provider ──────────────────────────────

import { prisma } from "@/lib/prisma";
import type { HealthCheckResult, ProviderConfig } from "./types";
import { PROVIDER_DEFAULTS } from "./types";
import { RateLimiter } from "./rate-limiter";
import { ProviderCache } from "./cache";
import { CircuitBreaker, withRetry } from "./error-handler";

// ─── EKAP API Types ─────────────────────────────────────────

export interface EkapSearchParams {
  searchText?: string;
  iknYili?: number;
  iknSayi?: number;
  ihaleTarihBaslangic?: string;
  ihaleTarihBitis?: string;
  ihaleDurumIdList?: number[];
  ihaleTuruIdList?: number[];
  ihaleUsulIdList?: number[];
  ilIdList?: number[];
  okasKodList?: string[];
  kurumIdList?: number[];
  eIhale?: boolean;
  ortakAlimMi?: boolean;
  kismiTeklifMi?: boolean;
  yabanciIsteklilereIzinVeriliyorMu?: boolean;
  sayfaNo?: number;
  sayfaBoyutu?: number;
}

export interface EkapTenderRaw {
  ihaleId: number;
  ihaleAdi: string;
  iknYili: number;
  iknSayi: number;
  idareAdi: string;
  il: string;
  ilce?: string;
  ihaleTarihi: string;
  yaklesikMaliyet?: number;
  ihaleTuru?: string;
  ihaleUsulu?: string;
  ihaleDurumu?: string;
  ihaleDurumId?: number;
  eIhale?: boolean;
  yabanciIsteklilereIzinVeriliyorMu?: boolean;
  kismiTeklifMi?: boolean;
  ortakAlimMi?: boolean;
  ilanTuru?: string;
  ilanTarihi?: string;
  okasKodlar?: string[];
  aciklama?: string;
  teminatOrani?: number;
  iletisimAdi?: string;
  iletisimTelefon?: string;
  iletisimEposta?: string;
}

interface EkapListResponse {
  list: EkapTenderRaw[];
  totalCount: number;
}

// ─── Mapping Helpers ────────────────────────────────────────

const TENDER_TYPE_MAP: Record<string, string> = {
  "Yapım": "YAPIM",
  "Mal Alımı": "MAL_ALIMI",
  "Hizmet Alımı": "HIZMET",
  "Danışmanlık Hizmet Alımı": "DANISMANLIK",
};

const STATUS_MAP: Record<number, string> = {
  1: "BASVURU_ACIK",
  2: "DEGERLENDIRME",
  3: "SONUCLANDI",
  4: "IPTAL",
  5: "YAKLASAN",
};

function mapTenderType(ekapType?: string): string {
  if (!ekapType) return "HIZMET";
  return TENDER_TYPE_MAP[ekapType] ?? "HIZMET";
}

function mapStatus(durumId?: number): string {
  if (!durumId) return "BASVURU_ACIK";
  return STATUS_MAP[durumId] ?? "BASVURU_ACIK";
}

// ─── EKAP Headers ───────────────────────────────────────────

const EKAP_HEADERS: Record<string, string> = {
  Accept: "application/json",
  "Content-Type": "application/json",
  "api-version": "v1",
  Origin: "https://ekapv2.kik.gov.tr",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};

// ─── Provider Config ────────────────────────────────────────

const EKAP_CONFIG: ProviderConfig = {
  name: "EKAP",
  baseUrl: process.env.EKAP_BASE_URL || "https://ekapv2.kik.gov.tr",
  rateLimitMs: PROVIDER_DEFAULTS.EKAP.rateLimitMs,
  maxTokens: PROVIDER_DEFAULTS.EKAP.maxTokens,
  cache: { ttl: 3600, staleWhileRevalidate: true, key: "ekap" },
  maxRetries: 3,
  baseDelayMs: 1000,
  circuitBreakerThreshold: PROVIDER_DEFAULTS.EKAP.circuitBreakerThreshold,
  circuitBreakerResetMs: PROVIDER_DEFAULTS.EKAP.circuitBreakerResetMs,
};

// ─── EKAP Provider Class ───────────────────────────────────

export class EkapProvider {
  private readonly config: ProviderConfig;
  private readonly rateLimiter: RateLimiter;
  private readonly cache: ProviderCache;
  private readonly circuitBreaker: CircuitBreaker;

  constructor(config: ProviderConfig = EKAP_CONFIG) {
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

  // ── Core API Methods ────────────────────────────────────

  async searchTenders(params: EkapSearchParams): Promise<EkapListResponse> {
    const body = {
      searchText: params.searchText ?? "",
      iknYili: params.iknYili ?? null,
      iknSayi: params.iknSayi ?? null,
      ihaleTarihBaslangic: params.ihaleTarihBaslangic ?? null,
      ihaleTarihBitis: params.ihaleTarihBitis ?? null,
      ihaleDurumIdList: params.ihaleDurumIdList ?? [],
      ihaleTuruIdList: params.ihaleTuruIdList ?? [],
      ihaleUsulIdList: params.ihaleUsulIdList ?? [],
      ilIdList: params.ilIdList ?? [],
      okasKodList: params.okasKodList ?? [],
      kurumIdList: params.kurumIdList ?? [],
      eIhale: params.eIhale ?? null,
      ortakAlimMi: params.ortakAlimMi ?? null,
      kismiTeklifMi: params.kismiTeklifMi ?? null,
      yabanciIsteklilereIzinVeriliyorMu:
        params.yabanciIsteklilereIzinVeriliyorMu ?? null,
      sayfaNo: params.sayfaNo ?? 1,
      sayfaBoyutu: params.sayfaBoyutu ?? 50,
    };

    const cacheKey = `ekap:search:${JSON.stringify(body)}`;
    const cached = await this.cache.get<EkapListResponse>(cacheKey);
    if (cached) return cached;

    await this.rateLimiter.acquire();

    const result = await this.circuitBreaker.execute(() =>
      withRetry(
        () => this.postApi("/b_ihalearama/api/Ihale/GetListByParameters", body),
        { maxRetries: this.config.maxRetries, baseDelayMs: this.config.baseDelayMs },
      ),
    );

    const response = result as EkapListResponse;
    await this.cache.set(cacheKey, response, this.config.cache, "EKAP");
    return response;
  }

  async getTenderDetail(ihaleId: number): Promise<EkapTenderRaw | null> {
    const cacheKey = `ekap:detail:${ihaleId}`;
    const cached = await this.cache.get<EkapTenderRaw>(cacheKey);
    if (cached) return cached;

    await this.rateLimiter.acquire();

    const result = await this.circuitBreaker.execute(() =>
      withRetry(
        () =>
          this.postApi(
            "/b_ihalearama/api/IhaleDetay/GetByIhaleIdIhaleDetay",
            { ihaleId },
          ),
        { maxRetries: this.config.maxRetries, baseDelayMs: this.config.baseDelayMs },
      ),
    );

    if (!result) return null;
    const tender = result as EkapTenderRaw;
    await this.cache.set(
      cacheKey,
      tender,
      { ...this.config.cache, ttl: 86400 },
      "EKAP",
    );
    return tender;
  }

  async getDocumentUrl(ihaleId: number): Promise<string | null> {
    await this.rateLimiter.acquire();
    const result = await this.postApi(
      "/b_ihalearama/api/EkapDokumanYonlendirme/GetDokumanUrl",
      { ihaleId },
    );
    return (result as { url?: string })?.url ?? null;
  }

  // ── Health Check ──────────────────────────────────────────

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

  // ── Tender Mapping & Upsert ───────────────────────────────

  mapToTenderData(raw: EkapTenderRaw) {
    const ekapNo = `${raw.iknYili}/${raw.iknSayi}`;
    return {
      ekapNo,
      title: raw.ihaleAdi,
      institution: raw.idareAdi,
      city: raw.il,
      district: raw.ilce ?? null,
      tenderType: mapTenderType(raw.ihaleTuru) as "YAPIM" | "MAL_ALIMI" | "HIZMET" | "DANISMANLIK",
      status: mapStatus(raw.ihaleDurumId) as "BASVURU_ACIK" | "DEGERLENDIRME" | "SONUCLANDI" | "IPTAL" | "YAKLASAN",
      deadline: new Date(raw.ihaleTarihi),
      publishDate: raw.ilanTarihi ? new Date(raw.ilanTarihi) : new Date(),
      estimatedCost: raw.yaklesikMaliyet ?? null,
      guaranteeRate: raw.teminatOrani ?? null,
      description: raw.aciklama ?? null,
      source: "EKAP",
      eIhale: raw.eIhale ?? false,
      foreignAllowed: raw.yabanciIsteklilereIzinVeriliyorMu ?? false,
      partialBid: raw.kismiTeklifMi ?? false,
      jointPurchase: raw.ortakAlimMi ?? false,
      announcementType: raw.ilanTuru ?? null,
      oksCodes: raw.okasKodlar
        ? JSON.parse(JSON.stringify(raw.okasKodlar))
        : null,
      contactPerson: raw.iletisimAdi ?? null,
      contactPhone: raw.iletisimTelefon ?? null,
      contactEmail: raw.iletisimEposta ?? null,
    };
  }

  async upsertTender(raw: EkapTenderRaw): Promise<string> {
    const data = this.mapToTenderData(raw);
    const result = await prisma.tender.upsert({
      where: { ekapNo: data.ekapNo },
      update: {
        title: data.title,
        institution: data.institution,
        city: data.city,
        district: data.district,
        tenderType: data.tenderType,
        status: data.status,
        deadline: data.deadline,
        estimatedCost: data.estimatedCost,
        description: data.description,
        source: data.source,
        eIhale: data.eIhale,
        foreignAllowed: data.foreignAllowed,
        partialBid: data.partialBid,
        jointPurchase: data.jointPurchase,
        announcementType: data.announcementType,
        oksCodes: data.oksCodes,
        contactPerson: data.contactPerson,
        contactPhone: data.contactPhone,
        contactEmail: data.contactEmail,
      },
      create: data,
      select: { id: true },
    });
    return result.id;
  }

  async batchUpsert(tenders: EkapTenderRaw[]): Promise<{
    inserted: number;
    updated: number;
    errors: number;
  }> {
    let inserted = 0;
    let updated = 0;
    let errors = 0;

    // Process in batches of 100
    const batchSize = 100;
    for (let i = 0; i < tenders.length; i += batchSize) {
      const batch = tenders.slice(i, i + batchSize);
      const ekapNos = batch.map((t) => `${t.iknYili}/${t.iknSayi}`);

      const existing = await prisma.tender.findMany({
        where: { ekapNo: { in: ekapNos } },
        select: { ekapNo: true },
      });
      const existingSet = new Set(existing.map((e) => e.ekapNo));

      for (const raw of batch) {
        try {
          const ekapNo = `${raw.iknYili}/${raw.iknSayi}`;
          await this.upsertTender(raw);
          if (existingSet.has(ekapNo)) {
            updated++;
          } else {
            inserted++;
          }
        } catch {
          errors++;
        }
      }
    }

    return { inserted, updated, errors };
  }

  // ── Sync Logging ──────────────────────────────────────────

  async logSync(
    operation: string,
    fn: () => Promise<number>,
  ) {
    const startedAt = new Date();
    const log = await prisma.dataSyncLog.create({
      data: { provider: "EKAP", operation, status: "RUNNING", startedAt },
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

  private async postApi(
    path: string,
    body: Record<string, unknown>,
  ): Promise<unknown> {
    const url = `${this.config.baseUrl}${path}`;
    const res = await fetch(url, {
      method: "POST",
      headers: EKAP_HEADERS,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      throw new Error(`EKAP API error: ${res.status} ${res.statusText}`);
    }

    return res.json();
  }
}

// ─── Singleton Instance ─────────────────────────────────────

const globalForEkap = globalThis as unknown as { ekapProvider?: EkapProvider };
export const ekapProvider =
  globalForEkap.ekapProvider ?? new EkapProvider();
if (process.env.NODE_ENV !== "production") {
  globalForEkap.ekapProvider = ekapProvider;
}
