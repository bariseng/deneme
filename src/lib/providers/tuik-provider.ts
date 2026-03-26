// ─── TÜİK Veri Portalı Provider ─────────────────────────────
// Macro price indices (construction cost, PPI, CPI) from data.tuik.gov.tr

import { prisma } from "@/lib/prisma";
import type { HealthCheckResult, ProviderConfig } from "./types";
import { PROVIDER_DEFAULTS } from "./types";
import { RateLimiter } from "./rate-limiter";
import { ProviderCache } from "./cache";
import { CircuitBreaker, withRetry } from "./error-handler";

// ─── Types ──────────────────────────────────────────────────

export interface MacroIndex {
  code: string;
  name: string;
  value: number;
  period: string;
  changeMonthly: number | null;
  changeYearly: number | null;
}

interface TuikGrafikVeriItem {
  deger: number;
  donem: string;
  aylikDegisim: number | null;
  yillikDegisim: number | null;
}

// ─── Type Guards ────────────────────────────────────────────

function isTuikGrafikVeriItem(val: unknown): val is TuikGrafikVeriItem {
  if (typeof val !== "object" || val === null) return false;
  const obj = val as Record<string, unknown>;
  return typeof obj.deger === "number" && typeof obj.donem === "string";
}

// ─── Index Code Mapping ─────────────────────────────────────

interface IndexDef {
  code: string;
  name: string;
  indicatorId: number;
  bultenKonuId: number;
}

const INDEX_DEFS: IndexDef[] = [
  { code: "INSAAT_MALIYET", name: "İnşaat Maliyet Endeksi", indicatorId: 1, bultenKonuId: 14 },
  { code: "INSAAT_ISCILIK", name: "İnşaat İşçilik Endeksi", indicatorId: 2, bultenKonuId: 14 },
  { code: "INSAAT_MALZEME", name: "İnşaat Malzeme Endeksi", indicatorId: 3, bultenKonuId: 14 },
  { code: "YIUFE", name: "Yİ-ÜFE (Yurt İçi Üretici Fiyat Endeksi)", indicatorId: 4, bultenKonuId: 10 },
  { code: "TUFE", name: "TÜFE (Tüketici Fiyat Endeksi)", indicatorId: 5, bultenKonuId: 9 },
];

const BASE_YEAR = 2015;

const MONTH_MAP: Record<string, string> = {
  ocak: "01", şubat: "02", mart: "03", nisan: "04",
  mayıs: "05", haziran: "06", temmuz: "07", ağustos: "08",
  eylül: "09", ekim: "10", kasım: "11", aralık: "12",
};

// ─── Request Headers ────────────────────────────────────────

const TUIK_HEADERS: Record<string, string> = {
  Accept: "application/json",
  "Content-Type": "application/json",
  Origin: "https://data.tuik.gov.tr",
  Referer: "https://data.tuik.gov.tr/",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};

// ─── Provider Config ────────────────────────────────────────

const TUIK_CONFIG: ProviderConfig = {
  name: "TUIK",
  baseUrl: "https://data.tuik.gov.tr",
  rateLimitMs: PROVIDER_DEFAULTS.TUIK.rateLimitMs,
  maxTokens: PROVIDER_DEFAULTS.TUIK.maxTokens,
  cache: { ttl: 86400, staleWhileRevalidate: true, key: "tuik" },
  maxRetries: 3,
  baseDelayMs: 1500,
  circuitBreakerThreshold: PROVIDER_DEFAULTS.TUIK.circuitBreakerThreshold,
  circuitBreakerResetMs: PROVIDER_DEFAULTS.TUIK.circuitBreakerResetMs,
};

// ─── TÜİK Provider Class ───────────────────────────────────

export class TuikProvider {
  private readonly config: ProviderConfig;
  private readonly rateLimiter: RateLimiter;
  private readonly cache: ProviderCache;
  private readonly circuitBreaker: CircuitBreaker;

  constructor(config: ProviderConfig = TUIK_CONFIG) {
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

  // ── Public Fetch Methods ──────────────────────────────────

  /** Fetch latest construction cost indices (maliyet, işçilik, malzeme). */
  async fetchConstructionCostIndex(): Promise<MacroIndex[]> {
    return this.fetchCached("tuik:construction_cost", (d) =>
      d.code.startsWith("INSAAT_"),
    );
  }

  /** Fetch Yİ-ÜFE (domestic PPI) data. */
  async fetchPPIIndex(): Promise<MacroIndex[]> {
    return this.fetchCached("tuik:ppi", (d) => d.code === "YIUFE");
  }

  /** Fetch TÜFE (CPI) data. */
  async fetchCPIIndex(): Promise<MacroIndex[]> {
    return this.fetchCached("tuik:cpi", (d) => d.code === "TUFE");
  }

  /**
   * Fetch all indices and upsert to MacroPriceIndex table.
   * Returns the total number of records upserted.
   */
  async syncMacroIndices(): Promise<number> {
    const allIndices: MacroIndex[] = [];

    for (const def of INDEX_DEFS) {
      try {
        const items = await this.fetchIndicator(def);
        allIndices.push(...items);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[TÜİK] Failed to fetch ${def.code}: ${msg}`);
      }
    }

    let upsertCount = 0;
    for (const idx of allIndices) {
      try {
        await prisma.macroPriceIndex.upsert({
          where: { code_period: { code: idx.code, period: idx.period } },
          update: {
            name: idx.name,
            value: idx.value,
            baseYear: BASE_YEAR,
            changeMonthly: idx.changeMonthly,
            changeYearly: idx.changeYearly,
            source: "TUIK",
          },
          create: {
            code: idx.code,
            name: idx.name,
            value: idx.value,
            baseYear: BASE_YEAR,
            period: idx.period,
            changeMonthly: idx.changeMonthly,
            changeYearly: idx.changeYearly,
            source: "TUIK",
          },
        });
        upsertCount++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[TÜİK] Failed to upsert ${idx.code}/${idx.period}: ${msg}`);
      }
    }

    return upsertCount;
  }

  /** Yİ-ÜFE price escalation: (Pn1 / Pn0) - 1. Periods in "YYYY-MM" format. */
  async calculatePriceDifference(
    baseMonth: string,
    currentMonth: string,
    indexCode = "YIUFE",
  ): Promise<number> {
    const [baseRecord, currentRecord] = await Promise.all([
      prisma.macroPriceIndex.findFirst({ where: { code: indexCode, period: baseMonth } }),
      prisma.macroPriceIndex.findFirst({ where: { code: indexCode, period: currentMonth } }),
    ]);

    if (!baseRecord) {
      throw new Error(`No index data found for ${indexCode} at period ${baseMonth}`);
    }
    if (!currentRecord) {
      throw new Error(`No index data found for ${indexCode} at period ${currentMonth}`);
    }
    if (baseRecord.value === 0) {
      throw new Error(`Base period index value is zero for ${baseMonth}`);
    }

    return currentRecord.value / baseRecord.value - 1;
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

  // ── Sync Logging ──────────────────────────────────────────

  async logSync(operation: string, fn: () => Promise<number>) {
    const startedAt = new Date();
    const log = await prisma.dataSyncLog.create({
      data: { provider: "TUIK", operation, status: "RUNNING", startedAt },
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

  // ── Private: Shared cache+fetch helper ────────────────────

  private async fetchCached(
    cacheKey: string,
    filter: (def: IndexDef) => boolean,
  ): Promise<MacroIndex[]> {
    const cached = await this.cache.get<MacroIndex[]>(cacheKey);
    if (cached) return cached;

    const defs = INDEX_DEFS.filter(filter);
    const results: MacroIndex[] = [];
    for (const def of defs) {
      const items = await this.fetchIndicator(def);
      results.push(...items);
    }

    if (results.length > 0) {
      await this.cache.set(cacheKey, results, this.config.cache, "TUIK");
    }
    return results;
  }

  // ── Private: Fetch a single indicator via TÜİK API ───────

  private async fetchIndicator(def: IndexDef): Promise<MacroIndex[]> {
    await this.rateLimiter.acquire();

    const rawData = await this.circuitBreaker.execute(() =>
      withRetry(
        () =>
          this.postApi("/api/GrafikVeri/GetSonDurum", {
            indicatorId: def.indicatorId,
            bultenKonuId: def.bultenKonuId,
          }),
        { maxRetries: this.config.maxRetries, baseDelayMs: this.config.baseDelayMs },
      ),
    );

    return this.parseGrafikVeriResponse(rawData, def);
  }

  /**
   * Parse the response from GetSonDurum endpoint.
   * The response shape is undocumented; we guard against unexpected formats.
   */
  private parseGrafikVeriResponse(rawData: unknown, def: IndexDef): MacroIndex[] {
    let items: unknown;

    if (Array.isArray(rawData)) {
      items = rawData;
    } else if (typeof rawData === "object" && rawData !== null) {
      const obj = rawData as Record<string, unknown>;
      items = obj.data ?? obj.value ?? obj.result ?? obj.items;
    }

    if (!items || !Array.isArray(items)) {
      console.warn(`[TÜİK] Unexpected response shape for ${def.code}; returning empty`);
      return [];
    }

    const results: MacroIndex[] = [];
    for (const item of items) {
      if (!isTuikGrafikVeriItem(item)) continue;
      const period = normalizePeriod(item.donem);
      if (!period) continue;

      results.push({
        code: def.code,
        name: def.name,
        value: item.deger,
        period,
        changeMonthly: item.aylikDegisim ?? null,
        changeYearly: item.yillikDegisim ?? null,
      });
    }

    return results;
  }

  // ── Private: HTTP helper ──────────────────────────────────

  private async postApi(path: string, body: Record<string, unknown>): Promise<unknown> {
    const url = `${this.config.baseUrl}${path}`;
    const res = await fetch(url, {
      method: "POST",
      headers: TUIK_HEADERS,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      throw new Error(`TÜİK API error: ${res.status} ${res.statusText}`);
    }

    return res.json() as Promise<unknown>;
  }
}

// ─── Period Normalization (module-level) ─────────────────────

function normalizePeriod(raw: string): string | null {
  if (/^\d{4}-\d{2}$/.test(raw)) return raw;

  const dashMatch = raw.match(/^(\d{4})-(\d{1,2})$/);
  if (dashMatch) return `${dashMatch[1]}-${dashMatch[2].padStart(2, "0")}`;

  const normalized = raw.toLowerCase().trim();
  for (const [monthName, monthNum] of Object.entries(MONTH_MAP)) {
    if (normalized.includes(monthName)) {
      const yearMatch = normalized.match(/\d{4}/);
      if (yearMatch) return `${yearMatch[0]}-${monthNum}`;
    }
  }

  return null;
}

// ─── Exported Functions (convenience wrappers) ──────────────

export async function fetchConstructionCostIndex(): Promise<MacroIndex[]> {
  return tuikProvider.fetchConstructionCostIndex();
}

export async function fetchPPIIndex(): Promise<MacroIndex[]> {
  return tuikProvider.fetchPPIIndex();
}

export async function fetchCPIIndex(): Promise<MacroIndex[]> {
  return tuikProvider.fetchCPIIndex();
}

export async function syncMacroIndices(): Promise<number> {
  return tuikProvider.syncMacroIndices();
}

export async function calculatePriceDifference(
  baseMonth: string,
  currentMonth: string,
  indexCode?: string,
): Promise<number> {
  return tuikProvider.calculatePriceDifference(baseMonth, currentMonth, indexCode);
}

// ─── Singleton Instance ─────────────────────────────────────

const globalForTuik = globalThis as unknown as { tuikProvider?: TuikProvider };
export const tuikProvider = globalForTuik.tuikProvider ?? new TuikProvider();
if (process.env.NODE_ENV !== "production") {
  globalForTuik.tuikProvider = tuikProvider;
}
