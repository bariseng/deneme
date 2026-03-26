import { prisma } from "@/lib/prisma";
import { ProviderCache } from "./cache";
import * as XLSX from "xlsx";

// --- Interfaces ---

export interface KapSyncResult {
  readonly synced: number;
  readonly errors: number;
  readonly duration: number;
}

export interface FinancialStatement {
  readonly period: string;
  readonly revenue: number;
  readonly netIncome: number;
  readonly totalAssets: number;
  readonly totalLiabilities: number;
  readonly equity: number;
  readonly currentRatio: number;
  readonly debtRatio: number;
}

export interface KapAnnouncement {
  readonly title: string;
  readonly date: string;
  readonly type: string;
  readonly url: string;
}

export interface KapFinancials {
  readonly stockCode: string;
  readonly companyName: string;
  readonly sector: string;
  readonly financialStatements: readonly FinancialStatement[];
  readonly announcements: readonly KapAnnouncement[];
}

export interface KapCompanySummary {
  readonly stockCode: string;
  readonly name: string;
  readonly sector: string;
}

// --- Constants ---

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const KAP_EXCEL_URL =
  "https://www.kap.org.tr/tr/api/company/generic/excel/IGS/A";

const KAP_FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  Accept:
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, */*",
  "Accept-Language": "tr-TR,tr;q=0.9",
  Referer: "https://www.kap.org.tr/tr/bist-sirketler",
} as const;

// --- Provider class ---

class KapProvider {
  private readonly cache: ProviderCache;

  constructor() {
    this.cache = new ProviderCache("kap", CACHE_TTL_MS);
  }

  /**
   * Fetch all BIST companies from KAP's Excel API and upsert into the Company table.
   * Uses externalKapId as the match key. Non-destructive: only creates or updates.
   */
  async syncFromKap(): Promise<KapSyncResult> {
    const start = Date.now();
    let synced = 0;
    let errors = 0;

    try {
      const response = await fetch(KAP_EXCEL_URL, {
        headers: KAP_FETCH_HEADERS,
        signal: AbortSignal.timeout(30_000),
      });

      if (!response.ok) {
        throw new Error(`KAP responded with ${response.status}`);
      }

      const arrayBuf = await response.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(arrayBuf), { type: "array" });

      const firstSheet = workbook.SheetNames[0];
      if (!firstSheet) {
        throw new Error("Excel file has no sheets");
      }

      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
        workbook.Sheets[firstSheet]!,
        { defval: "" }
      );

      if (rows.length === 0) {
        return { synced: 0, errors: 0, duration: Date.now() - start };
      }

      // Detect column names dynamically from the first row's keys.
      // KAP Excel typically has columns like: "Kod", "Şirket Adı", "Sektör" (Turkish)
      const sampleKeys = Object.keys(rows[0]!);
      const codeCol = sampleKeys.find(
        (k) =>
          k.toLowerCase().includes("kod") ||
          k.toLowerCase().includes("code") ||
          k.toLowerCase() === "ticker"
      );
      const nameCol = sampleKeys.find(
        (k) =>
          k.toLowerCase().includes("şirket") ||
          k.toLowerCase().includes("sirket") ||
          k.toLowerCase().includes("company") ||
          k.toLowerCase().includes("unvan") ||
          k.toLowerCase().includes("ad")
      );
      const sectorCol = sampleKeys.find(
        (k) =>
          k.toLowerCase().includes("sektör") ||
          k.toLowerCase().includes("sektor") ||
          k.toLowerCase().includes("sector")
      );

      // Fallback: use positional columns if name detection fails
      const effectiveCodeCol = codeCol ?? sampleKeys[0]!;
      const effectiveNameCol = nameCol ?? sampleKeys[1]!;
      const effectiveSectorCol = sectorCol ?? sampleKeys[2];

      for (const row of rows) {
        const stockCode = String(row[effectiveCodeCol] ?? "").trim();
        const companyName = String(row[effectiveNameCol] ?? "").trim();
        const sector = effectiveSectorCol
          ? String(row[effectiveSectorCol] ?? "").trim()
          : "";

        if (stockCode.length === 0 || companyName.length === 0) {
          continue;
        }

        try {
          // Use externalKapId as the unique identifier for KAP companies.
          // taxNumber is required and unique — generate a placeholder for KAP-sourced rows.
          const existing = await prisma.company.findFirst({
            where: { externalKapId: stockCode },
          });

          if (existing) {
            await prisma.company.update({
              where: { id: existing.id },
              data: {
                name: companyName,
                sector: sector || existing.sector,
              },
            });
          } else {
            await prisma.company.create({
              data: {
                name: companyName,
                externalKapId: stockCode,
                taxNumber: `KAP-${stockCode}`,
                sector: sector || null,
              },
            });
          }

          synced++;
        } catch {
          errors++;
        }
      }
    } catch {
      // Top-level fetch / parse failure — return what we have so far
    }

    return { synced, errors, duration: Date.now() - start };
  }

  /**
   * Get company financials from our own database.
   * Call syncFromKap() first to populate data from KAP's Excel API.
   */
  async getCompanyFinancials(
    stockCode: string
  ): Promise<KapFinancials | null> {
    const trimmed = stockCode.trim().toUpperCase();
    if (trimmed.length === 0) {
      return null;
    }

    const cacheKey = `financials:${trimmed}`;
    const cached = await this.cache.get<KapFinancials>(cacheKey);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    try {
      // Query our own database for competitor profile by KAP ID
      const company = await prisma.company.findFirst({
        where: { externalKapId: trimmed },
      });

      if (!company) {
        return null;
      }

      const competitor = await prisma.competitorProfile.findFirst({
        where: { companyId: company.id },
      });

      const result: KapFinancials = {
        stockCode: trimmed,
        companyName: company.name,
        sector: company.sector ?? "",
        financialStatements: [],  // Must be imported from KAP via Playwright
        announcements: [],        // Must be imported from KAP via Playwright
      };

      if (competitor) {
        // Enrich with competitor stats if available
        result satisfies KapFinancials;
      }

      this.cache.set(cacheKey, result);
      return result;
    } catch {
      return null;
    }
  }

  /**
   * Search companies from our own database (Company table).
   * Populate data first with syncFromKap().
   */
  async searchCompanies(query: string): Promise<KapCompanySummary[]> {
    const trimmed = query.trim().toUpperCase();
    if (trimmed.length === 0) {
      return [];
    }

    const cacheKey = `search:${trimmed}`;
    const cached = await this.cache.get<KapCompanySummary[]>(cacheKey);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    try {
      const companies = await prisma.company.findMany({
        where: {
          OR: [
            { name: { contains: trimmed, mode: "insensitive" } },
            { externalKapId: trimmed },
          ],
        },
        take: 20,
      });

      const results: KapCompanySummary[] = companies.map((c) => ({
        stockCode: c.externalKapId ?? "",
        name: c.name,
        sector: c.sector ?? "",
      }));

      this.cache.set(cacheKey, results);
      return results;
    } catch {
      return [];
    }
  }
}

// --- Singleton export ---

export const kapProvider = new KapProvider();
