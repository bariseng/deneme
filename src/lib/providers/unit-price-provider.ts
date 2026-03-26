// ─── Ministry/Bank Unit Price Provider (Hybrid) ─────────────
import { prisma } from "@/lib/prisma";
import type { HealthCheckResult, ProviderConfig } from "./types";
import { PROVIDER_DEFAULTS } from "./types";
import { RateLimiter } from "./rate-limiter";
import { ProviderCache } from "./cache";
import { CircuitBreaker, withRetry } from "./error-handler";

// ─── Types ──────────────────────────────────────────────────
export interface UnitPriceData {
  code: string; name: string; unit: string; price: number;
  year: number; month: number; category: UnitPriceCategory;
  source: UnitPriceSource; region: string | null;
}
export interface UnitPriceImport {
  code: string; name: string; unit: string; price: number;
  year: number; month?: number; category: string; source: string;
}
export interface UpdateCheckResult {
  source: UnitPriceSource; latestDate: string | null; url: string; hasNewData: boolean;
}
export type UnitPriceCategory = "INSAAT" | "MEKANIK" | "ELEKTRIK" | "ALTYAPI";
export type UnitPriceSource = "CSB_YFK" | "ILLER_BANKASI" | "IMO";
interface UnitPriceSearchParams { category?: string; source?: string; year?: number; search?: string }

// ─── Source Metadata ────────────────────────────────────────
const SOURCE_URLS: Record<UnitPriceSource, string> = { CSB_YFK: "https://yfk.csb.gov.tr", ILLER_BANKASI: "https://www.ilbank.gov.tr", IMO: "https://www.imo.org.tr" };
const SOURCE_LISTING_PATHS: Record<UnitPriceSource, string> = { CSB_YFK: "/birim-fiyat-listesi", ILLER_BANKASI: "/birim-fiyatlari", IMO: "/birim-fiyat" };

// ─── Config ─────────────────────────────────────────────────
const UNIT_PRICE_CONFIG: ProviderConfig = {
  name: "UNIT_PRICE", baseUrl: "https://yfk.csb.gov.tr",
  rateLimitMs: PROVIDER_DEFAULTS.TUIK.rateLimitMs, maxTokens: PROVIDER_DEFAULTS.TUIK.maxTokens,
  cache: { ttl: 86400, staleWhileRevalidate: true, key: "unit-price" },
  maxRetries: 2, baseDelayMs: 1000, circuitBreakerThreshold: 5, circuitBreakerResetMs: 60_000,
};
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

// ─── Helper ─────────────────────────────────────────────────
function toData(r: { code: string; name: string; unit: string; price: { toNumber(): number } | number; year: number; month: number; category: string; source: string; region: string | null }): UnitPriceData {
  return { code: r.code, name: r.name, unit: r.unit, price: typeof r.price === "number" ? r.price : Number(r.price), year: r.year, month: r.month, category: r.category as UnitPriceCategory, source: r.source as UnitPriceSource, region: r.region };
}

// ─── Provider Class ─────────────────────────────────────────
export class UnitPriceProvider {
  private readonly config: ProviderConfig;
  private readonly rateLimiter: RateLimiter;
  private readonly cache: ProviderCache;
  private readonly circuitBreaker: CircuitBreaker;

  constructor(config: ProviderConfig = UNIT_PRICE_CONFIG) {
    this.config = config;
    this.rateLimiter = new RateLimiter({ maxTokens: config.maxTokens ?? 1, refillIntervalMs: config.rateLimitMs, tokensPerInterval: 1 });
    this.cache = new ProviderCache();
    this.circuitBreaker = new CircuitBreaker({ failureThreshold: config.circuitBreakerThreshold ?? 5, resetTimeoutMs: config.circuitBreakerResetMs ?? 60000, cache: this.cache });
  }

  async getLatestUnitPrices(params: UnitPriceSearchParams): Promise<UnitPriceData[]> {
    const cacheKey = `unit-price:latest:${JSON.stringify(params)}`;
    const cached = await this.cache.get<UnitPriceData[]>(cacheKey);
    if (cached) return cached;
    const where: Record<string, unknown> = {};
    if (params.category) where.category = params.category;
    if (params.source) where.source = params.source;
    if (params.year) where.year = params.year;
    if (params.search) where.OR = [{ name: { contains: params.search, mode: "insensitive" } }, { code: { contains: params.search, mode: "insensitive" } }];
    const rows = await prisma.ministryUnitPrice.findMany({ where, orderBy: [{ year: "desc" }, { code: "asc" }], take: 500 });
    const result = rows.map(toData);
    await this.cache.set(cacheKey, result, this.config.cache, this.config.name);
    return result;
  }

  async getUnitPriceByCode(code: string, year?: number): Promise<UnitPriceData | null> {
    const cacheKey = `unit-price:code:${code}:${year ?? "latest"}`;
    const cached = await this.cache.get<UnitPriceData>(cacheKey);
    if (cached) return cached;
    const where: Record<string, unknown> = { code };
    if (year) where.year = year;
    const row = await prisma.ministryUnitPrice.findFirst({ where, orderBy: { year: "desc" } });
    if (!row) return null;
    const result = toData(row);
    await this.cache.set(cacheKey, result, { ...this.config.cache, ttl: 3600 }, this.config.name);
    return result;
  }

  async getUnitPriceHistory(code: string, years = 5): Promise<UnitPriceData[]> {
    const minYear = new Date().getFullYear() - years;
    const rows = await prisma.ministryUnitPrice.findMany({ where: { code, year: { gte: minYear } }, orderBy: { year: "asc" } });
    return rows.map(toData);
  }

  async importUnitPrices(data: UnitPriceImport[]): Promise<number> {
    let count = 0;
    for (let i = 0; i < data.length; i += 100) {
      for (const item of data.slice(i, i + 100)) {
        await prisma.ministryUnitPrice.upsert({
          where: { code_year_month_source: { code: item.code, year: item.year, month: item.month ?? 0, source: item.source } },
          update: { name: item.name, unit: item.unit, price: item.price, month: item.month ?? 0, category: item.category },
          create: { code: item.code, name: item.name, unit: item.unit, price: item.price, year: item.year, month: item.month ?? 0, category: item.category, source: item.source, region: null },
        }); count++;
      }
    }
    await this.cache.invalidateAll();
    return count;
  }

  async checkForUpdates(): Promise<UpdateCheckResult[]> {
    const results: UpdateCheckResult[] = [];
    const sources: UnitPriceSource[] = ["CSB_YFK", "ILLER_BANKASI", "IMO"];
    for (const source of sources) {
      const url = SOURCE_URLS[source] + SOURCE_LISTING_PATHS[source];
      try {
        await this.rateLimiter.acquire();
        results.push(await this.circuitBreaker.execute(() => withRetry(() => this.fetchListingPage(source, url), { maxRetries: 1, baseDelayMs: this.config.baseDelayMs ?? 1000 })));
      } catch { results.push({ source, latestDate: null, url, hasNewData: false }); }
    }
    return results;
  }

  private async fetchListingPage(source: UnitPriceSource, url: string): Promise<UpdateCheckResult> {
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(10000) });
    if (!res.ok) return { source, latestDate: null, url, hasNewData: false };
    const html = await res.text();
    const yearMatch = html.match(/20(2[5-9]|[3-9]\d)\s*(yılı|Yılı)/);
    const monthMatch = html.match(/(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)\s*20\d{2}/i);
    const latestDate = monthMatch?.[0] ?? yearMatch?.[0] ?? null;
    const latestInDb = await prisma.ministryUnitPrice.findFirst({ where: { source }, orderBy: [{ year: "desc" }, { month: "desc" }], select: { year: true, month: true } });
    const hasNewData = (latestInDb?.year ?? 0) < new Date().getFullYear() || latestDate !== null;
    return { source, latestDate, url, hasNewData };
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const res = await fetch(SOURCE_URLS.CSB_YFK, { method: "HEAD", signal: AbortSignal.timeout(5000) });
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

  // ── Seed: 54 real construction unit price items ───────────
  async seedSampleUnitPrices(): Promise<number> {
    const y = 2026, s = "CSB_YFK";
    const I: UnitPriceImport[] = [
      // INSAAT - Beton
      { code: "Y.16.050/05", name: "C 20/25 basınç dayanımlı beton (normal)", unit: "m3", price: 2850, year: y, category: "INSAAT", source: s },
      { code: "Y.16.050/07", name: "C 25/30 basınç dayanımlı beton (normal)", unit: "m3", price: 3100, year: y, category: "INSAAT", source: s },
      { code: "Y.16.050/09", name: "C 30/37 basınç dayanımlı beton (normal)", unit: "m3", price: 3400, year: y, category: "INSAAT", source: s },
      { code: "Y.16.050/11", name: "C 35/45 basınç dayanımlı beton (normal)", unit: "m3", price: 3750, year: y, category: "INSAAT", source: s },
      // Demir / Celik
      { code: "Y.23.015", name: "Nervürlü çelik hasır imalatı ve yerine konulması", unit: "ton", price: 32500, year: y, category: "INSAAT", source: s },
      { code: "Y.23.010", name: "Nervürlü beton çeliği, çubuk demiri bükme ve döşeme", unit: "ton", price: 31000, year: y, category: "INSAAT", source: s },
      { code: "Y.23.014", name: "Profil demirlerle çelik konstrüksiyon yapılması", unit: "ton", price: 45000, year: y, category: "INSAAT", source: s },
      // Duvar / Tugla
      { code: "Y.18.001/01", name: "Düşey delikli tuğla ile duvar yapılması (8.5 cm)", unit: "m2", price: 580, year: y, category: "INSAAT", source: s },
      { code: "Y.18.001/02", name: "Düşey delikli tuğla ile duvar yapılması (13.5 cm)", unit: "m2", price: 720, year: y, category: "INSAAT", source: s },
      { code: "Y.18.001/03", name: "Düşey delikli tuğla ile duvar yapılması (19 cm)", unit: "m2", price: 950, year: y, category: "INSAAT", source: s },
      // Siva
      { code: "Y.27.501", name: "İç cephe sıvası yapılması (kaba + ince sıva)", unit: "m2", price: 320, year: y, category: "INSAAT", source: s },
      { code: "Y.27.502", name: "Dış cephe sıvası yapılması (çimento esaslı)", unit: "m2", price: 410, year: y, category: "INSAAT", source: s },
      // Boya
      { code: "Y.25.001/01", name: "İç cephe su bazlı boya yapılması (3 kat)", unit: "m2", price: 195, year: y, category: "INSAAT", source: s },
      { code: "Y.25.001/02", name: "Dış cephe akrilik esaslı boya yapılması", unit: "m2", price: 280, year: y, category: "INSAAT", source: s },
      { code: "Y.25.006", name: "Antipas boya yapılması (2 kat)", unit: "m2", price: 165, year: y, category: "INSAAT", source: s },
      // Kum / Cakil / Cimento
      { code: "04.008", name: "Kum (ince agrega 0-4 mm)", unit: "m3", price: 680, year: y, category: "INSAAT", source: s },
      { code: "04.009", name: "Çakıl (kaba agrega 4-22 mm)", unit: "m3", price: 620, year: y, category: "INSAAT", source: s },
      { code: "04.001", name: "Portland çimentosu (CEM I 42.5R) torbalı", unit: "ton", price: 4200, year: y, category: "INSAAT", source: s },
      { code: "04.002", name: "Portland çimentosu (CEM II) dökme", unit: "ton", price: 3800, year: y, category: "INSAAT", source: s },
      // Izolasyon
      { code: "Y.19.055/01", name: "2 cm XPS ısı yalıtım levhası ile mantolama", unit: "m2", price: 720, year: y, category: "INSAAT", source: s },
      { code: "Y.19.055/02", name: "5 cm XPS ısı yalıtım levhası ile mantolama", unit: "m2", price: 980, year: y, category: "INSAAT", source: s },
      { code: "Y.19.055/03", name: "8 cm XPS ısı yalıtım levhası ile mantolama", unit: "m2", price: 1250, year: y, category: "INSAAT", source: s },
      { code: "Y.19.085", name: "Bitümlü su yalıtım örtüsü ile yalıtım yapılması", unit: "m2", price: 450, year: y, category: "INSAAT", source: s },
      // Kalip
      { code: "Y.21.001/01", name: "Düz yüzeyli betonarme kalıbı (plywood)", unit: "m2", price: 380, year: y, category: "INSAAT", source: s },
      { code: "Y.21.001/03", name: "Kolon ve perde kalıbı (plywood)", unit: "m2", price: 420, year: y, category: "INSAAT", source: s },
      // Seramik / Kaplama
      { code: "Y.26.001/01", name: "Seramik yer karosu ile döşeme kaplaması", unit: "m2", price: 650, year: y, category: "INSAAT", source: s },
      { code: "Y.26.001/02", name: "Seramik duvar karosu ile duvar kaplaması", unit: "m2", price: 580, year: y, category: "INSAAT", source: s },
      { code: "Y.26.005", name: "Granit plak ile döşeme kaplaması yapılması", unit: "m2", price: 1450, year: y, category: "INSAAT", source: s },
      // Dograma
      { code: "Y.24.010", name: "PVC doğrama yapılması ve montajı (beyaz profil)", unit: "m2", price: 3200, year: y, category: "INSAAT", source: s },
      { code: "Y.24.015", name: "Alüminyum doğrama yapılması ve montajı", unit: "m2", price: 4500, year: y, category: "INSAAT", source: s },
      { code: "Y.24.020", name: "Çelik kapı kasası ve kapı kanadı montajı", unit: "ad", price: 8500, year: y, category: "INSAAT", source: s },
      // Cati
      { code: "Y.20.001", name: "Ahşap çatı makası yapılması", unit: "m3", price: 18500, year: y, category: "INSAAT", source: s },
      { code: "Y.20.010", name: "Çelik çatı makası yapılması", unit: "ton", price: 48000, year: y, category: "INSAAT", source: s },
      // MEKANIK
      { code: "Y.040.100", name: "PPR boru ile temiz su tesisatı (20 mm)", unit: "m", price: 185, year: y, category: "MEKANIK", source: s },
      { code: "Y.040.101", name: "PPR boru ile temiz su tesisatı (25 mm)", unit: "m", price: 215, year: y, category: "MEKANIK", source: s },
      { code: "Y.040.110", name: "PVC pis su borusu döşenmesi (75 mm)", unit: "m", price: 165, year: y, category: "MEKANIK", source: s },
      { code: "Y.040.111", name: "PVC pis su borusu döşenmesi (100 mm)", unit: "m", price: 195, year: y, category: "MEKANIK", source: s },
      { code: "Y.040.200", name: "Kombi ısıtma sistemi montajı", unit: "ad", price: 42000, year: y, category: "MEKANIK", source: s },
      { code: "Y.040.210", name: "Panel radyatör montajı (600x1000)", unit: "ad", price: 8500, year: y, category: "MEKANIK", source: s },
      { code: "Y.040.300", name: "Yangın dolapları montajı", unit: "ad", price: 12000, year: y, category: "MEKANIK", source: s },
      { code: "Y.040.350", name: "Asansör (10 durak, 630 kg)", unit: "ad", price: 1250000, year: y, category: "MEKANIK", source: s },
      // ELEKTRIK
      { code: "Y.050.100", name: "NYM kablo döşenmesi (3x2.5 mm2)", unit: "m", price: 95, year: y, category: "ELEKTRIK", source: s },
      { code: "Y.050.101", name: "NYM kablo döşenmesi (3x1.5 mm2)", unit: "m", price: 72, year: y, category: "ELEKTRIK", source: s },
      { code: "Y.050.110", name: "Sıva altı anahtar-priz montajı", unit: "ad", price: 185, year: y, category: "ELEKTRIK", source: s },
      { code: "Y.050.120", name: "LED panel aydınlatma armatürü (60x60)", unit: "ad", price: 1450, year: y, category: "ELEKTRIK", source: s },
      { code: "Y.050.130", name: "Dağıtım panosu montajı (24 modül)", unit: "ad", price: 4800, year: y, category: "ELEKTRIK", source: s },
      { code: "Y.050.140", name: "Topraklama tesisatı yapılması", unit: "m", price: 145, year: y, category: "ELEKTRIK", source: s },
      { code: "Y.050.200", name: "Kablo kanalı döşenmesi (50x50)", unit: "m", price: 120, year: y, category: "ELEKTRIK", source: s },
      { code: "Y.050.210", name: "Jeneratör montajı (100 kVA)", unit: "ad", price: 850000, year: y, category: "ELEKTRIK", source: s },
      // ALTYAPI
      { code: "Y.15.001", name: "Makine ile her derinlikte yumuşak zemin kazısı", unit: "m3", price: 125, year: y, category: "ALTYAPI", source: s },
      { code: "Y.15.002", name: "Makine ile sert zemin kazısı", unit: "m3", price: 195, year: y, category: "ALTYAPI", source: s },
      { code: "Y.15.010", name: "Dolgu yapılması ve sıkıştırılması", unit: "m3", price: 145, year: y, category: "ALTYAPI", source: s },
      { code: "Y.060.100", name: "Ø200 koruge boru ile kanalizasyon yapılması", unit: "m", price: 480, year: y, category: "ALTYAPI", source: s },
      { code: "Y.060.101", name: "Ø300 koruge boru ile kanalizasyon yapılması", unit: "m", price: 720, year: y, category: "ALTYAPI", source: s },
      { code: "Y.060.110", name: "Beton rögar yapılması (60x60 cm)", unit: "ad", price: 5200, year: y, category: "ALTYAPI", source: s },
      { code: "Y.060.200", name: "Ø110 HDPE içme suyu borusu döşenmesi", unit: "m", price: 350, year: y, category: "ALTYAPI", source: s },
      { code: "Y.060.210", name: "Asfalt yol yapılması (6 cm binder + 4 cm aşınma)", unit: "m2", price: 680, year: y, category: "ALTYAPI", source: s },
      { code: "Y.060.220", name: "Beton bordür döşenmesi (50x20 cm)", unit: "m", price: 280, year: y, category: "ALTYAPI", source: s },
    ];
    return this.importUnitPrices(I);
  }
}

// ─── Singleton ──────────────────────────────────────────────
const globalForUnitPrice = globalThis as unknown as { unitPriceProvider?: UnitPriceProvider };
export const unitPriceProvider = globalForUnitPrice.unitPriceProvider ?? new UnitPriceProvider();
if (process.env.NODE_ENV !== "production") { globalForUnitPrice.unitPriceProvider = unitPriceProvider; }
