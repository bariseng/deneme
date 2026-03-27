// ─── TED API v3 Provider — EU Tender Data ───────────────────
// API docs: https://docs.ted.europa.eu/api/latest/index.html
// No API key required for search

import { prisma } from "@/lib/prisma";
import { tedLimiter } from "./rate-limiter";
import { ProviderCache } from "./cache";
import type { SyncLogResult } from "./types";
import { convertToTry } from "./exchange-rate";

// ─── TED API Types ──────────────────────────────────────────

export interface TedNoticeRaw {
  noticeId: string;
  title: string;
  buyerName?: string;
  buyerCountry?: string;
  estimatedValue?: number;
  currency?: string;
  deadline?: string;
  cpvCodes?: string[];
  noticeType?: string;
  publicationDate?: string;
  description?: string;
}

export interface TedSearchParams {
  country?: string;
  cpvCodes?: string[];
  dateFrom?: string;
  dateTo?: string;
  noticeType?: string;
  query?: string;
  page?: number;
  pageSize?: number;
}

interface TedSearchResponse {
  notices: TedNoticeRaw[];
  totalCount: number;
}

// ─── Target Countries ───────────────────────────────────────

export const TARGET_COUNTRIES: ReadonlyArray<{
  code: string;
  name: string;
  nameTr: string;
}> = [
  { code: "TUR", name: "Turkey", nameTr: "Türkiye" },
  { code: "DEU", name: "Germany", nameTr: "Almanya" },
  { code: "FRA", name: "France", nameTr: "Fransa" },
  { code: "ITA", name: "Italy", nameTr: "İtalya" },
  { code: "NLD", name: "Netherlands", nameTr: "Hollanda" },
  { code: "BEL", name: "Belgium", nameTr: "Belçika" },
  { code: "AUT", name: "Austria", nameTr: "Avusturya" },
  { code: "POL", name: "Poland", nameTr: "Polonya" },
] as const;

// ─── CPV → Sector Mapping ───────────────────────────────────

const CPV_SECTOR_MAP: Readonly<Record<string, string>> = {
  "03": "Tarım",
  "09": "Enerji",
  "15": "Gıda",
  "30": "BT Ekipman",
  "33": "Tıbbi Cihaz",
  "34": "Ulaşım",
  "42": "Sanayi Makine",
  "44": "Yapı Malzeme",
  "45": "Yapım",
  "48": "Yazılım",
  "50": "Bakım Onarım",
  "55": "Otelcilik",
  "60": "Taşımacılık",
  "64": "Telekomünikasyon",
  "71": "Danışmanlık",
  "72": "Bilişim",
  "79": "İş Hizmetleri",
  "85": "Sağlık",
  "90": "Çevre",
};

function mapCpvToSector(cpvCodes?: string[]): string {
  if (!cpvCodes || cpvCodes.length === 0) return "Genel";
  const prefix = cpvCodes[0].slice(0, 2);
  return CPV_SECTOR_MAP[prefix] ?? "Genel";
}

// ─── Config ─────────────────────────────────────────────────

const TED_BASE_URL = "https://api.ted.europa.eu";

const TED_HEADERS: Readonly<Record<string, string>> = {
  "Content-Type": "application/json",
  Accept: "application/json",
  "User-Agent": "IhalePro/1.0",
};

const CACHE_TTL_SECONDS = 86400; // 24 hours

// ─── TED v3 API Response Shapes ─────────────────────────────

interface TedApiNotice {
  "publication-number"?: string;
  "notice-title"?: Record<string, string>;
  "buyer-name"?: Record<string, string[]>;
  "buyer-country"?: string[];
  "classification-cpv"?: string[];
  "publication-date"?: string;
  "notice-type"?: string;
  "description-lot"?: Record<string, string[]>;
  "deadline-receipt-tender-date-lot"?: string[];
  "estimated-value-lot"?: string[];
  links?: Record<string, Record<string, string>>;
}

interface TedApiSearchResult {
  notices?: TedApiNotice[];
  totalNoticeCount?: number;
  iterationNextToken?: string;
  timedOut?: boolean;
}

// ─── Search fields we request ────────────────────────────────

const SEARCH_FIELDS = [
  "publication-number",
  "notice-title",
  "buyer-name",
  "buyer-country",
  "classification-cpv",
  "publication-date",
  "notice-type",
  "description-lot",
  "deadline-receipt-tender-date-lot",
  "estimated-value-lot",
] as const;

// ─── API Response → TedNoticeRaw Mapper ─────────────────────

function mapApiToRaw(item: TedApiNotice): TedNoticeRaw | null {
  const noticeId = item["publication-number"];
  if (!noticeId) return null;

  // Extract title — prefer English, then Turkish, then first available
  const titleMap = item["notice-title"] ?? {};
  const title =
    titleMap["eng"] ?? titleMap["tur"] ?? Object.values(titleMap)[0] ?? "Untitled";

  // Extract buyer name
  const buyerMap = item["buyer-name"] ?? {};
  const buyerArr =
    buyerMap["eng"] ?? buyerMap["tur"] ?? Object.values(buyerMap)[0];
  const buyerName = buyerArr?.[0] ?? undefined;

  // Extract buyer country
  const countries = item["buyer-country"] ?? [];
  const buyerCountry = countries[0] ?? undefined;

  // Extract CPV codes
  const cpvCodes = item["classification-cpv"] ?? undefined;

  // Extract estimated value
  const values = item["estimated-value-lot"] ?? [];
  const estimatedValue =
    values.length > 0 ? parseFloat(values[0]) : undefined;

  // Extract deadline
  const deadlines = item["deadline-receipt-tender-date-lot"] ?? [];
  const deadline = deadlines[0] ?? undefined;

  // Extract description
  const descMap = item["description-lot"] ?? {};
  const descArr =
    descMap["eng"] ?? descMap["tur"] ?? Object.values(descMap)[0];
  const description = descArr?.[0]?.substring(0, 5000) ?? undefined;

  return {
    noticeId,
    title,
    buyerName,
    buyerCountry,
    estimatedValue:
      estimatedValue && !isNaN(estimatedValue) ? estimatedValue : undefined,
    currency: "EUR",
    deadline,
    cpvCodes,
    noticeType: item["notice-type"] ?? undefined,
    publicationDate: item["publication-date"] ?? undefined,
    description,
  };
}

// ─── TED Provider Class ────────────────────────────────────

class TedProvider {
  private readonly cache: ProviderCache;

  constructor() {
    this.cache = new ProviderCache("ted", CACHE_TTL_SECONDS);
  }

  // ── Search Notices ──────────────────────────────────────

  async searchNotices(params: TedSearchParams): Promise<TedSearchResponse> {
    const queryString = this.buildQuery(params);
    const page = params.page ?? 1;
    const pageSize = Math.min(params.pageSize ?? 100, 250);

    const cacheKey = `search:${queryString}:${page}:${pageSize}`;

    return (await this.cache.get<TedSearchResponse>(cacheKey, async () => {
      await tedLimiter.acquire();

      const body = {
        query: queryString,
        fields: [...SEARCH_FIELDS],
        page,
        limit: pageSize,
        paginationMode: "PAGE_NUMBER",
      };

      const url = `${TED_BASE_URL}/v3/notices/search`;
      const res = await fetch(url, {
        method: "POST",
        headers: TED_HEADERS,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          `TED API error: ${res.status} ${res.statusText} — ${text.substring(0, 200)}`,
        );
      }

      const data = (await res.json()) as TedApiSearchResult;
      const rawNotices = (data.notices ?? [])
        .map(mapApiToRaw)
        .filter((n): n is TedNoticeRaw => n !== null);

      return {
        notices: rawNotices,
        totalCount: data.totalNoticeCount ?? rawNotices.length,
      };
    }))!;
  }

  // ── Sync construction tenders for target countries ─────

  async syncConstructionTenders(
    daysBack: number = 30,
  ): Promise<{ inserted: number; updated: number; errors: number }> {
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - daysBack);
    const dateStr = dateFrom.toISOString().split("T")[0].replace(/-/g, "");

    let totalInserted = 0;
    let totalUpdated = 0;
    let totalErrors = 0;

    // Fetch construction tenders (CPV 45*) for each target country
    for (const country of TARGET_COUNTRIES) {
      try {
        const result = await this.searchNotices({
          query: `classification-cpv = 45* AND buyer-country = ${country.code} AND publication-date >= ${dateStr}`,
          pageSize: 100,
        });

        if (result.notices.length > 0) {
          const upsertResult = await this.batchUpsert(result.notices);
          totalInserted += upsertResult.inserted;
          totalUpdated += upsertResult.updated;
          totalErrors += upsertResult.errors;
        }
      } catch (err) {
        console.error(
          `[TED] Failed to sync ${country.code}:`,
          err instanceof Error ? err.message : String(err),
        );
        totalErrors++;
      }
    }

    return {
      inserted: totalInserted,
      updated: totalUpdated,
      errors: totalErrors,
    };
  }

  // ── Get Notice Detail ───────────────────────────────────

  async getNoticeById(noticeId: string): Promise<TedNoticeRaw | null> {
    const cacheKey = `notice:${noticeId}`;

    try {
      return await this.cache.get<TedNoticeRaw>(cacheKey, async () => {
        await tedLimiter.acquire();

        const url = `${TED_BASE_URL}/v3/notices/${noticeId}`;
        const res = await fetch(url, {
          headers: TED_HEADERS,
          signal: AbortSignal.timeout(15000),
        });

        if (!res.ok) {
          throw new Error(`TED API error: ${res.status} ${res.statusText}`);
        }

        const item = (await res.json()) as TedApiNotice;
        const mapped = mapApiToRaw(item);
        if (!mapped) throw new Error(`Invalid notice data for ${noticeId}`);
        return mapped;
      });
    } catch {
      return null;
    }
  }

  // ── Batch Upsert ────────────────────────────────────────

  async batchUpsert(
    notices: TedNoticeRaw[],
  ): Promise<{ inserted: number; updated: number; errors: number }> {
    let inserted = 0;
    let updated = 0;
    let errors = 0;

    const externalIds = notices
      .map((n) => n.noticeId)
      .filter((id): id is string => Boolean(id));

    const existing = await prisma.internationalTender.findMany({
      where: { externalId: { in: externalIds } },
      select: { externalId: true },
    });
    const existingSet = new Set(existing.map((e) => e.externalId));

    for (const raw of notices) {
      try {
        const data = await this.mapToDbRecord(raw);
        await prisma.internationalTender.upsert({
          where: { externalId: data.externalId },
          update: {
            title: data.title,
            country: data.country,
            sector: data.sector,
            estimatedBudget: data.estimatedBudget,
            estimatedBudgetTry: data.estimatedBudgetTry,
            currency: data.currency,
            description: data.description ?? undefined,
            applicationDeadline: data.applicationDeadline,
            sourceUrl: data.sourceUrl,
            cpvCodes: data.cpvCodes ?? undefined,
            buyerName: data.buyerName,
            buyerCountry: data.buyerCountry,
            noticeType: data.noticeType,
          },
          create: {
            ...data,
            description: data.description ?? "",
            cpvCodes: data.cpvCodes ?? undefined,
          },
        });

        if (existingSet.has(raw.noticeId)) {
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

  // ── Sync Logging ────────────────────────────────────────

  async logSync(
    operation: string,
    fn: () => Promise<number>,
  ): Promise<SyncLogResult> {
    const startedAt = new Date();
    const log = await prisma.dataSyncLog.create({
      data: { provider: "TED", operation, status: "RUNNING", startedAt },
    });

    try {
      const recordCount = await fn();
      const durationMs = Date.now() - startedAt.getTime();
      await prisma.dataSyncLog.update({
        where: { id: log.id },
        data: {
          status: "COMPLETED",
          recordCount,
          completedAt: new Date(),
        },
      });
      return { status: "COMPLETED", recordCount, durationMs };
    } catch (error) {
      const durationMs = Date.now() - startedAt.getTime();
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await prisma.dataSyncLog.update({
        where: { id: log.id },
        data: {
          status: "FAILED",
          errorMessage,
          completedAt: new Date(),
        },
      });
      return {
        status: "FAILED",
        recordCount: 0,
        durationMs,
        error: errorMessage,
      };
    }
  }

  // ── Health Check ────────────────────────────────────────

  async healthCheck(): Promise<{ ok: boolean; latencyMs: number }> {
    const start = Date.now();
    try {
      const res = await fetch(`${TED_BASE_URL}/v3/notices/search`, {
        method: "POST",
        headers: TED_HEADERS,
        body: JSON.stringify({
          query: "publication-date >= 20260101",
          fields: ["publication-number"],
          limit: 1,
          paginationMode: "PAGE_NUMBER",
        }),
        signal: AbortSignal.timeout(5000),
      });
      return { ok: res.ok, latencyMs: Date.now() - start };
    } catch {
      return { ok: false, latencyMs: Date.now() - start };
    }
  }

  // ── Private: Query Builder ──────────────────────────────

  private buildQuery(params: TedSearchParams): string {
    // If raw query provided, use it directly
    if (params.query) return params.query;

    const parts: string[] = [];

    if (params.cpvCodes && params.cpvCodes.length > 0) {
      const cpvPart = params.cpvCodes
        .map((c) => `classification-cpv = ${c}`)
        .join(" OR ");
      parts.push(params.cpvCodes.length > 1 ? `(${cpvPart})` : cpvPart);
    }

    if (params.country) {
      parts.push(`buyer-country = ${params.country}`);
    }

    if (params.dateFrom) {
      parts.push(
        `publication-date >= ${params.dateFrom.replace(/-/g, "")}`,
      );
    }
    if (params.dateTo) {
      parts.push(
        `publication-date <= ${params.dateTo.replace(/-/g, "")}`,
      );
    }

    if (params.noticeType) {
      parts.push(`notice-type = ${params.noticeType}`);
    }

    return parts.length > 0 ? parts.join(" AND ") : "publication-date >= 20260101";
  }

  // ── Private: DB Record Mapper ───────────────────────────

  private async mapToDbRecord(raw: TedNoticeRaw) {
    const currency = raw.currency ?? "EUR";
    const amount = raw.estimatedValue;

    let estimatedBudgetTry: number | null = null;
    if (amount && amount > 0) {
      try {
        estimatedBudgetTry = await convertToTry(amount, currency);
      } catch {
        estimatedBudgetTry = null;
      }
    }

    return {
      externalId: raw.noticeId,
      title: raw.title,
      titleTr: null as string | null,
      country: raw.buyerCountry ?? "EU",
      city: null as string | null,
      sector: mapCpvToSector(raw.cpvCodes),
      estimatedBudget: amount ?? null,
      estimatedBudgetTry,
      currency,
      description: raw.description ?? null,
      descriptionTr: null as string | null,
      applicationDeadline: raw.deadline
        ? new Date(raw.deadline)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      sourceUrl: `https://ted.europa.eu/en/notice/-/detail/${raw.noticeId}`,
      sourcePlatform: "TED" as const,
      cpvCodes: raw.cpvCodes
        ? (JSON.parse(JSON.stringify(raw.cpvCodes)) as string[])
        : null,
      buyerName: raw.buyerName ?? null,
      buyerCountry: raw.buyerCountry ?? null,
      noticeType: raw.noticeType ?? null,
      languageCode: "EN",
    };
  }
}

// ─── Singleton ──────────────────────────────────────────────

const globalForTed = globalThis as unknown as { tedProvider?: TedProvider };
export const tedProvider = globalForTed.tedProvider ?? new TedProvider();
if (process.env.NODE_ENV !== "production") {
  globalForTed.tedProvider = tedProvider;
}
