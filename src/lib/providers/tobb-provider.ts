// ─── TOBB Commodity Exchange Provider ────────────────────────
// Scrapes commodity prices from TOBB member exchanges (borsa.tobb.org.tr).
import { prisma } from "@/lib/prisma";
import type { HealthCheckResult, ProviderConfig } from "./types";
import { RateLimiter } from "./rate-limiter";
import { ProviderCache } from "./cache";
import { CircuitBreaker, withRetry } from "./error-handler";

// ─── Types ──────────────────────────────────────────────────
export interface CommodityData {
  code: string; name: string; price: number; unit: string;
  city: string; exchange: string | null; date: Date;
}
interface CommoditySearchParams { city?: string; category?: string }
interface ParsedRow { name: string; price: number; unit: string; city: string; exchange: string }

// ─── Config ─────────────────────────────────────────────────
const TOBB_CONFIG: ProviderConfig = {
  name: "TOBB", baseUrl: "https://borsa.tobb.org.tr", rateLimitMs: 2000, maxTokens: 2,
  cache: { ttl: 21600, staleWhileRevalidate: true, key: "tobb" },
  maxRetries: 2, baseDelayMs: 1500, circuitBreakerThreshold: 5, circuitBreakerResetMs: 60_000,
};
const HEADERS: Record<string, string> = {
  Accept: "text/html,application/xhtml+xml",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Referer: "https://borsa.tobb.org.tr/",
};

// ─── HTML Parse + Code Gen ──────────────────────────────────
function parseHtmlTable(html: string): ParsedRow[] {
  const rows: ParsedRow[] = [];
  const rowRe = /<tr[^>]*>\s*(?:<td[^>]*>([\s\S]*?)<\/td>\s*){3,}/gi;
  const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  let rm: RegExpExecArray | null;
  while ((rm = rowRe.exec(html)) !== null) {
    const cells: string[] = [];
    let cm: RegExpExecArray | null;
    cellRe.lastIndex = 0;
    while ((cm = cellRe.exec(rm[0])) !== null) cells.push(cm[1].replace(/<[^>]+>/g, "").trim());
    if (cells.length >= 4) {
      const price = parseFloat(cells[1].replace(/[.\s]/g, "").replace(",", "."));
      if (!isNaN(price) && price > 0 && cells[0].length > 1)
        rows.push({ name: cells[0], price, unit: cells[2] || "kg", city: cells[3] || "", exchange: cells[4] ?? cells[3] ?? "" });
    }
  }
  return rows;
}
function generateCode(name: string): string {
  return name.toUpperCase().replace(/[İ]/g, "I").replace(/[Ğ]/g, "G").replace(/[Ü]/g, "U").replace(/[Ş]/g, "S").replace(/[Ö]/g, "O").replace(/[Ç]/g, "C").replace(/[^A-Z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "").slice(0, 30);
}

// ─── Provider Class ─────────────────────────────────────────
export class TobbProvider {
  private readonly config: ProviderConfig;
  private readonly rateLimiter: RateLimiter;
  private readonly cache: ProviderCache;
  private readonly circuitBreaker: CircuitBreaker;

  constructor(config: ProviderConfig = TOBB_CONFIG) {
    this.config = config;
    this.rateLimiter = new RateLimiter({ maxTokens: config.maxTokens ?? 1, refillIntervalMs: config.rateLimitMs, tokensPerInterval: 1 });
    this.cache = new ProviderCache();
    this.circuitBreaker = new CircuitBreaker({ failureThreshold: config.circuitBreakerThreshold ?? 5, resetTimeoutMs: config.circuitBreakerResetMs ?? 60000, cache: this.cache });
  }

  /** Fetch latest commodity prices — live scrape with DB fallback. */
  async fetchCommodityPrices(params?: CommoditySearchParams): Promise<CommodityData[]> {
    const cacheKey = `tobb:prices:${JSON.stringify(params ?? {})}`;
    const cached = await this.cache.get<CommodityData[]>(cacheKey);
    if (cached) return cached;
    try {
      await this.rateLimiter.acquire();
      const live = await this.circuitBreaker.execute(() => withRetry(() => this.scrape(params), { maxRetries: this.config.maxRetries, baseDelayMs: this.config.baseDelayMs ?? 1000 }));
      if (live.length > 0) { await this.cache.set(cacheKey, live, this.config.cache, this.config.name); return live; }
    } catch (err) { console.warn(`[TOBB] Live fetch failed: ${err instanceof Error ? err.message : String(err)}`); }
    return this.queryDb(params);
  }

  /** Price history for a commodity from DB. */
  async getCommodityHistory(code: string, days = 90): Promise<CommodityData[]> {
    const since = new Date(); since.setDate(since.getDate() - days);
    const rows = await prisma.commodityPrice.findMany({ where: { code, date: { gte: since } }, orderBy: { date: "asc" } });
    return rows.map((r) => ({ code: r.code, name: r.name, price: Number(r.price), unit: r.unit, city: r.city, exchange: r.exchange, date: r.date }));
  }

  /** Fetch and upsert prices to DB. */
  async syncCommodityPrices(): Promise<number> {
    let data: CommodityData[];
    try {
      await this.rateLimiter.acquire();
      data = await this.circuitBreaker.execute(() => withRetry(() => this.scrape(), { maxRetries: this.config.maxRetries, baseDelayMs: this.config.baseDelayMs ?? 1000 }));
    } catch (err) { console.error(`[TOBB] Sync failed: ${err instanceof Error ? err.message : String(err)}`); return 0; }
    let count = 0;
    for (const item of data) {
      try {
        await prisma.commodityPrice.upsert({
          where: { code_city_date_source: { code: item.code, city: item.city, date: item.date, source: "TOBB" } },
          update: { name: item.name, price: item.price, unit: item.unit, exchange: item.exchange, source: "TOBB" },
          create: { code: item.code, name: item.name, price: item.price, unit: item.unit, city: item.city, exchange: item.exchange, date: item.date, source: "TOBB" },
        }); count++;
      } catch (err) { console.error(`[TOBB] Upsert ${item.code}: ${err instanceof Error ? err.message : String(err)}`); }
    }
    await this.cache.invalidateAll();
    return count;
  }

  /** Seed DB with 35 common Turkish construction commodities. */
  async seedSampleCommodities(): Promise<number> {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    const ist = "İstanbul Ticaret Borsası", ank = "Ankara Ticaret Borsası", izm = "İzmir Ticaret Borsası";
    const items: Omit<CommodityData, "date">[] = [
      { code: "CIMENTO_TORBA", name: "Portland Çimentosu (torbalı)", price: 4200, unit: "ton", city: "Ankara", exchange: ank },
      { code: "CIMENTO_DOKME", name: "Portland Çimentosu (dökme)", price: 3750, unit: "ton", city: "İstanbul", exchange: ist },
      { code: "KUM_INCE", name: "İnce Kum (0-4 mm)", price: 620, unit: "ton", city: "İstanbul", exchange: ist },
      { code: "CAKIL_KABA", name: "Kaba Çakıl (4-22 mm)", price: 580, unit: "ton", city: "Ankara", exchange: ank },
      { code: "MICIR", name: "Mıcır (kırma taş)", price: 490, unit: "ton", city: "İzmir", exchange: izm },
      { code: "DEMIR_NERVUR_8", name: "Nervürlü İnşaat Demiri (Ø8)", price: 28500, unit: "ton", city: "İstanbul", exchange: ist },
      { code: "DEMIR_NERVUR_12", name: "Nervürlü İnşaat Demiri (Ø12)", price: 27800, unit: "ton", city: "İstanbul", exchange: ist },
      { code: "DEMIR_NERVUR_16", name: "Nervürlü İnşaat Demiri (Ø16)", price: 27500, unit: "ton", city: "İzmir", exchange: izm },
      { code: "PROFIL_DEMIR", name: "Profil Demir (IPE)", price: 35000, unit: "ton", city: "İstanbul", exchange: ist },
      { code: "BAKIR_KABLO", name: "Bakır Kablo (elektrolitik)", price: 285000, unit: "ton", city: "İstanbul", exchange: ist },
      { code: "ALUMINYUM_PROFIL", name: "Alüminyum Profil", price: 145000, unit: "ton", city: "Ankara", exchange: ank },
      { code: "GALVANIZ_SAC", name: "Galvaniz Sac (0.5 mm)", price: 38000, unit: "ton", city: "İstanbul", exchange: ist },
      { code: "KERESTE_CAM", name: "Çam Kereste (1. sınıf)", price: 14500, unit: "m3", city: "Bolu", exchange: "Bolu Ticaret Borsası" },
      { code: "KERESTE_KAYIN", name: "Kayın Kereste", price: 18000, unit: "m3", city: "Düzce", exchange: "Düzce Ticaret Borsası" },
      { code: "MDF_18", name: "MDF Levha (18 mm)", price: 1250, unit: "ad", city: "Ankara", exchange: ank },
      { code: "KONTRPLAK_18", name: "Kontrplak (18 mm)", price: 1850, unit: "ad", city: "İstanbul", exchange: ist },
      { code: "PVC_BORU_110", name: "PVC Boru (Ø110 mm)", price: 185, unit: "m", city: "İstanbul", exchange: ist },
      { code: "PVC_BORU_200", name: "PVC Boru (Ø200 mm)", price: 420, unit: "m", city: "İstanbul", exchange: ist },
      { code: "PPR_BORU_20", name: "PPR Boru (Ø20 mm)", price: 48, unit: "m", city: "Ankara", exchange: ank },
      { code: "HDPE_BORU_110", name: "HDPE Boru (Ø110 mm)", price: 280, unit: "m", city: "İzmir", exchange: izm },
      { code: "XPS_5CM", name: "XPS Isı Yalıtım Levhası (5 cm)", price: 420, unit: "m2", city: "Ankara", exchange: ank },
      { code: "EPS_5CM", name: "EPS Strafor (5 cm)", price: 280, unit: "m2", city: "İstanbul", exchange: ist },
      { code: "TASUNU_5CM", name: "Taş Yünü Levha (5 cm)", price: 350, unit: "m2", city: "İstanbul", exchange: ist },
      { code: "TUGLA_85", name: "Düşey Delikli Tuğla (8.5 cm)", price: 5800, unit: "1000 ad", city: "Ankara", exchange: ank },
      { code: "TUGLA_135", name: "Düşey Delikli Tuğla (13.5 cm)", price: 7200, unit: "1000 ad", city: "İstanbul", exchange: ist },
      { code: "BIMS_BLOK", name: "Bims Blok (19 cm)", price: 14, unit: "ad", city: "Kayseri", exchange: "Kayseri Ticaret Borsası" },
      { code: "GAZBETON_10", name: "Gazbeton Blok (10 cm)", price: 2850, unit: "m3", city: "Ankara", exchange: ank },
      { code: "HAZIR_BETON_C25", name: "Hazır Beton C25/30", price: 2950, unit: "m3", city: "İstanbul", exchange: ist },
      { code: "HAZIR_BETON_C30", name: "Hazır Beton C30/37", price: 3250, unit: "m3", city: "İstanbul", exchange: ist },
      { code: "BOYA_IC_CEPHE", name: "İç Cephe Boyası (su bazlı)", price: 850, unit: "20 lt", city: "İstanbul", exchange: ist },
      { code: "BOYA_DIS_CEPHE", name: "Dış Cephe Boyası (akrilik)", price: 1450, unit: "20 lt", city: "İstanbul", exchange: ist },
      { code: "SERAMIK_YER", name: "Seramik Yer Karosu (1. kalite)", price: 380, unit: "m2", city: "Kütahya", exchange: "Kütahya Ticaret Borsası" },
      { code: "SERAMIK_DUVAR", name: "Seramik Duvar Karosu (1. kalite)", price: 320, unit: "m2", city: "Kütahya", exchange: "Kütahya Ticaret Borsası" },
      { code: "BITUM_5070", name: "Bitüm 50/70", price: 18500, unit: "ton", city: "İzmit", exchange: "Kocaeli Ticaret Borsası" },
      { code: "ASFALT_PLENT", name: "Asfalt (plent çıkışı)", price: 2800, unit: "ton", city: "Ankara", exchange: ank },
    ];
    let count = 0;
    for (const it of items) {
      try {
        await prisma.commodityPrice.upsert({
          where: { code_city_date_source: { code: it.code, city: it.city, date: d, source: "TOBB" } },
          update: { name: it.name, price: it.price, unit: it.unit, exchange: it.exchange, source: "TOBB" },
          create: { ...it, date: d, source: "TOBB" },
        }); count++;
      } catch (err) { console.error(`[TOBB] Seed ${it.code}: ${err instanceof Error ? err.message : String(err)}`); }
    }
    return count;
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const res = await fetch(this.config.baseUrl, { method: "HEAD", headers: HEADERS, signal: AbortSignal.timeout(5000) });
      return { ok: res.ok, latencyMs: Date.now() - start };
    } catch { return { ok: false, latencyMs: Date.now() - start }; }
  }

  async logSync(operation: string, fn: () => Promise<number>) {
    const startedAt = new Date();
    const log = await prisma.dataSyncLog.create({ data: { provider: this.config.name, operation, status: "RUNNING", startedAt } });
    try {
      const recordCount = await fn();
      await prisma.dataSyncLog.update({ where: { id: log.id }, data: { status: "COMPLETED", recordCount, completedAt: new Date() } });
      return { status: "COMPLETED" as const, recordCount };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      await prisma.dataSyncLog.update({ where: { id: log.id }, data: { status: "FAILED", errorMessage: msg, completedAt: new Date() } });
      return { status: "FAILED" as const, recordCount: 0, errorMessage: msg };
    }
  }

  private async scrape(params?: CommoditySearchParams): Promise<CommodityData[]> {
    const url = new URL("/liste", this.config.baseUrl);
    if (params?.city) url.searchParams.set("il", params.city);
    if (params?.category) url.searchParams.set("kategori", params.category);
    const res = await fetch(url.toString(), { headers: HEADERS, signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`TOBB scrape failed: ${res.status} ${res.statusText}`);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return parseHtmlTable(await res.text()).map((r) => ({ code: generateCode(r.name), name: r.name, price: r.price, unit: r.unit, city: r.city, exchange: r.exchange, date: today }));
  }

  private async queryDb(params?: CommoditySearchParams): Promise<CommodityData[]> {
    const where: Record<string, unknown> = {};
    if (params?.city) where.city = params.city;
    const rows = await prisma.commodityPrice.findMany({ where, orderBy: { date: "desc" }, take: 200 });
    return rows.map((r) => ({ code: r.code, name: r.name, price: Number(r.price), unit: r.unit, city: r.city, exchange: r.exchange, date: r.date }));
  }
}

// ─── Singleton ──────────────────────────────────────────────
const globalForTobb = globalThis as unknown as { tobbProvider?: TobbProvider };
export const tobbProvider = globalForTobb.tobbProvider ?? new TobbProvider();
if (process.env.NODE_ENV !== "production") { globalForTobb.tobbProvider = tobbProvider; }
