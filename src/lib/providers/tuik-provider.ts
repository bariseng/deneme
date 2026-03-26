// ─── TÜİK Provider — Macro Price Indices via TCMB EVDS ─────
// Construction cost, PPI (Yİ-ÜFE), CPI (TÜFE)

import { prisma } from "@/lib/prisma";
import { tuikLimiter } from "./rate-limiter";
import { ProviderCache } from "./cache";

// ─── Types ──────────────────────────────────────────────────

export interface MacroIndexEntry {
  period: string;
  value: number;
  change: number;
  yearOverYear: number;
}

// ─── EVDS Series Codes ──────────────────────────────────────

interface EvdsSeries {
  code: string;
  name: string;
  indexName: string;
}

const CONSTRUCTION_SERIES: EvdsSeries = {
  code: "TP.FG.J0",  // İnşaat ayrı seri yok, ÜFE'yi kullan (inşaat alt kalemi)
  name: "İnşaat Maliyet Endeksi (ÜFE proxy)",
  indexName: "İnşaat Maliyet",
};

const PPI_SERIES: EvdsSeries = {
  code: "TP.FG.J0",
  name: "Yİ-ÜFE (Yurt İçi Üretici Fiyat Endeksi)",
  indexName: "Yİ-ÜFE",
};

const CPI_SERIES: EvdsSeries = {
  code: "TP.TUFE1YI.T1",
  name: "TÜFE (Tüketici Fiyat Endeksi)",
  indexName: "TÜFE",
};

// ─── EVDS Response Shape ────────────────────────────────────

interface EvdsItem {
  Tarih?: string;
  [key: string]: string | number | undefined;
}

interface EvdsResponse {
  items?: EvdsItem[];
  totalCount?: number;
}

// ─── Config ─────────────────────────────────────────────────

const EVDS_BASE_URL = process.env.TCMB_EVDS_URL || "https://evds3.tcmb.gov.tr/igmevdsms-dis";
const CACHE_TTL_SECONDS = 86400; // 24 hours

function getEvdsApiKey(): string | null {
  return process.env.TCMB_EVDS_KEY ?? null;
}

// ─── Date Helpers ───────────────────────────────────────────

function formatEvdsDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function getDefaultDateRange(): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  start.setFullYear(start.getFullYear() - 2);
  return {
    startDate: formatEvdsDate(start),
    endDate: formatEvdsDate(end),
  };
}

/**
 * Parse EVDS date string to YYYY-MM period format.
 * EVDS3 uses "YYYY-M" for monthly data (e.g., "2025-1") or "dd-MM-yyyy" for daily.
 */
function toPeriod(dateStr: string): string | null {
  // Monthly format: "2025-1", "2025-12"
  const monthlyMatch = dateStr.match(/^(\d{4})-(\d{1,2})$/);
  if (monthlyMatch) {
    const [, yyyy, m] = monthlyMatch;
    return `${yyyy}-${m.padStart(2, "0")}`;
  }
  // Daily format: "dd-MM-yyyy"
  const parts = dateStr.split("-");
  if (parts.length < 3) return null;
  const [dd, mm, yyyy] = parts;
  if (!yyyy || !mm || !dd) return null;
  return `${yyyy}-${mm}`;
}

// ─── EVDS Item Parser ───────────────────────────────────────

function parseEvdsItems(
  items: EvdsItem[],
  seriesCode: string,
): MacroIndexEntry[] {
  const entries: MacroIndexEntry[] = [];
  let previousValue: number | null = null;
  const yearMap = new Map<string, number>();

  for (const item of items) {
    const dateStr = item.Tarih;
    if (!dateStr || typeof dateStr !== "string") continue;

    const period = toPeriod(dateStr);
    if (!period) continue;

    // EVDS3 returns keys with underscores instead of dots (TP.FG.J0 → TP_FG_J0)
    const underscoreKey = seriesCode.replace(/\./g, "_");
    const rawValue = item[underscoreKey] ?? item[seriesCode];
    if (rawValue === undefined || rawValue === null) continue;

    const value =
      typeof rawValue === "number" ? rawValue : parseFloat(String(rawValue));
    if (isNaN(value)) continue;

    const change =
      previousValue !== null && previousValue !== 0
        ? ((value - previousValue) / previousValue) * 100
        : 0;

    const yearKey = period.slice(0, 4);
    const monthKey = period.slice(5, 7);

    // Compute year-over-year from prior year same month
    const prevYearKey = String(Number(yearKey) - 1);
    const prevYearPeriod = `${prevYearKey}-${monthKey}`;
    const prevYearValue = yearMap.get(prevYearPeriod) ?? null;

    const yearOverYear =
      prevYearValue !== null && prevYearValue !== 0
        ? ((value - prevYearValue) / prevYearValue) * 100
        : 0;

    entries.push({
      period,
      value: Math.round(value * 100) / 100,
      change: Math.round(change * 100) / 100,
      yearOverYear: Math.round(yearOverYear * 100) / 100,
    });

    yearMap.set(period, value);
    previousValue = value;
  }

  return entries;
}

// ─── TÜİK Provider Class ───────────────────────────────────

class TuikProvider {
  private readonly cache: ProviderCache;

  constructor() {
    this.cache = new ProviderCache("tuik", CACHE_TTL_SECONDS);
  }

  // ── Public Fetch Methods ──────────────────────────────

  async fetchConstructionCostIndex(): Promise<MacroIndexEntry[]> {
    return (await this.cache.get<MacroIndexEntry[]>(
      "construction_cost",
      () => this.fetchSeries(CONSTRUCTION_SERIES),
    )) ?? [];
  }

  async fetchPPIIndex(): Promise<MacroIndexEntry[]> {
    return (await this.cache.get<MacroIndexEntry[]>(
      "ppi",
      () => this.fetchSeries(PPI_SERIES),
    )) ?? [];
  }

  async fetchCPIIndex(): Promise<MacroIndexEntry[]> {
    return (await this.cache.get<MacroIndexEntry[]>(
      "cpi",
      () => this.fetchSeries(CPI_SERIES),
    )) ?? [];
  }

  // ── Sync to Database ──────────────────────────────────

  async syncMacroIndices(): Promise<number> {
    const allSeries = [CONSTRUCTION_SERIES, PPI_SERIES, CPI_SERIES];
    let totalSynced = 0;

    for (const series of allSeries) {
      try {
        const entries = await this.fetchSeries(series);
        const count = await this.upsertEntries(entries, series.indexName);
        totalSynced += count;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[TÜİK] Failed to sync ${series.code}: ${msg}`);
      }
    }

    return totalSynced;
  }

  // ── Health Check ──────────────────────────────────────

  async healthCheck(): Promise<{ ok: boolean; latencyMs: number }> {
    const start = Date.now();
    const apiKey = getEvdsApiKey();
    if (!apiKey) {
      return { ok: false, latencyMs: Date.now() - start };
    }

    try {
      const url = `${EVDS_BASE_URL}/series=${CPI_SERIES.code}&startDate=01-01-2025&endDate=01-02-2025&type=json&key=${apiKey}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      return { ok: res.ok, latencyMs: Date.now() - start };
    } catch {
      return { ok: false, latencyMs: Date.now() - start };
    }
  }

  // ── Sync Logging ──────────────────────────────────────

  async logSync(
    operation: string,
    fn: () => Promise<number>,
  ): Promise<{ status: "COMPLETED" | "FAILED"; recordCount: number; durationMs: number; error?: string }> {
    const startedAt = new Date();
    const log = await prisma.dataSyncLog.create({
      data: { provider: "TUIK", operation, status: "RUNNING", startedAt },
    });

    try {
      const recordCount = await fn();
      const durationMs = Date.now() - startedAt.getTime();
      await prisma.dataSyncLog.update({
        where: { id: log.id },
        data: { status: "COMPLETED", recordCount, completedAt: new Date() },
      });
      return { status: "COMPLETED", recordCount, durationMs };
    } catch (error) {
      const durationMs = Date.now() - startedAt.getTime();
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await prisma.dataSyncLog.update({
        where: { id: log.id },
        data: { status: "FAILED", errorMessage, completedAt: new Date() },
      });
      return { status: "FAILED", recordCount: 0, durationMs, error: errorMessage };
    }
  }

  // ── Private: Fetch from EVDS ──────────────────────────

  private async fetchSeries(series: EvdsSeries): Promise<MacroIndexEntry[]> {
    const apiKey = getEvdsApiKey();
    if (!apiKey) {
      console.warn(
        `[TÜİK] TCMB_EVDS_KEY not set — returning empty for ${series.code}`,
      );
      return [];
    }

    await tuikLimiter.acquire();

    const { startDate, endDate } = getDefaultDateRange();
    // EVDS3: key goes in header, not URL
    const url =
      `${EVDS_BASE_URL}/series=${series.code}` +
      `&startDate=${startDate}&endDate=${endDate}` +
      `&type=json`;

    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "IhalePro/1.0",
        key: apiKey,
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      throw new Error(
        `TCMB EVDS error for ${series.code}: ${res.status} ${res.statusText}`,
      );
    }

    const data = (await res.json()) as EvdsResponse;
    const items = data.items ?? [];

    return parseEvdsItems(items, series.code);
  }

  // ── Private: Upsert to PriceIndex ─────────────────────

  private async upsertEntries(
    entries: MacroIndexEntry[],
    indexName: string,
  ): Promise<number> {
    let count = 0;

    for (const entry of entries) {
      try {
        await prisma.priceIndex.upsert({
          where: {
            sector_item_month: {
              sector: "Makro Endeks",
              item: indexName,
              month: entry.period,
            },
          },
          update: {
            price: entry.value,
            change: entry.change,
            source: "TÜİK",
          },
          create: {
            sector: "Makro Endeks",
            item: indexName,
            unit: "",
            month: entry.period,
            price: entry.value,
            change: entry.change,
            source: "TÜİK",
          },
        });
        count++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(
          `[TÜİK] Failed to upsert ${indexName}/${entry.period}: ${msg}`,
        );
      }
    }

    return count;
  }
}

// ─── Singleton ──────────────────────────────────────────────

const globalForTuik = globalThis as unknown as { tuikProvider?: TuikProvider };
export const tuikProvider =
  globalForTuik.tuikProvider ?? new TuikProvider();
if (process.env.NODE_ENV !== "production") {
  globalForTuik.tuikProvider = tuikProvider;
}
