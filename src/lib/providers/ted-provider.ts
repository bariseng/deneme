// ─── TED API v3 Provider — EU Tender Data ───────────────────

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

const TED_BASE_URL =
  process.env.TED_API_URL || "https://api.ted.europa.eu";

const TED_HEADERS: Readonly<Record<string, string>> = {
  Accept: "application/json",
  "User-Agent": "IhalePro/1.0",
};

const CACHE_TTL_SECONDS = 86400; // 24 hours

// ─── Raw API Response Shapes ────────────────────────────────

// eForms v3 response shape
interface TedApiNotice {
  "publication-number"?: string;
  "BT-21-Procedure"?: Record<string, string>; // title per language
  "BT-09(b)-Procedure"?: string;  // buyer country
  "BT-131(d)-Lot"?: string[];     // deadlines
  "BT-27-Lot"?: string[];         // estimated values
  links?: Record<string, Record<string, string>>;
}

interface TedApiSearchResult {
  notices?: TedApiNotice[];
  totalCount?: number;
  total?: number;
}

// ─── API Response → TedNoticeRaw Mapper ─────────────────────

function mapApiToRaw(item: TedApiNotice): TedNoticeRaw | null {
  const noticeId = item["publication-number"];
  if (!noticeId) return null;

  // Extract title — prefer English, fallback to first available
  const titleMap = item["BT-21-Procedure"] ?? {};
  const title = titleMap["eng"] ?? titleMap["ENG"] ?? Object.values(titleMap)[0] ?? "Untitled";

  // Extract estimated value from array
  const values = item["BT-27-Lot"] ?? [];
  const estimatedValue = values.length > 0 ? parseFloat(values[0]) : undefined;

  // Extract deadline
  const deadlines = item["BT-131(d)-Lot"] ?? [];
  const deadline = deadlines.length > 0 ? deadlines[0] : undefined;

  return {
    noticeId,
    title,
    buyerCountry: item["BT-09(b)-Procedure"] ?? undefined,
    estimatedValue: estimatedValue && !isNaN(estimatedValue) ? estimatedValue : undefined,
    currency: "EUR",
    deadline,
    publicationDate: undefined,
    description: undefined,
    buyerName: undefined,
    cpvCodes: undefined,
    noticeType: undefined,
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
    const queryParts = this.buildQueryParts(params);
    const queryString = queryParts.length > 0 ? queryParts.join(" AND ") : "*";
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 50;

    const cacheKey = `search:${queryString}:${page}:${pageSize}`;

    return (await this.cache.get<TedSearchResponse>(cacheKey, async () => {
      await tedLimiter.acquire();

      // TED v3 uses POST with eForms field IDs
      const body = {
        query: queryString,
        fields: [
          "BT-21-Procedure",    // title
          "BT-09(b)-Procedure", // buyer country
          "BT-131(d)-Lot",      // deadline
          "BT-27-Lot",          // estimated value
          "publication-number",
        ],
        limit: pageSize,
        page,
      };

      const url = `${TED_BASE_URL}/v3/notices/search`;
      const res = await fetch(url, {
        method: "POST",
        headers: { ...TED_HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        throw new Error(`TED API error: ${res.status} ${res.statusText}`);
      }

      const data = (await res.json()) as TedApiSearchResult;
      const rawNotices = (data.notices ?? [])
        .map(mapApiToRaw)
        .filter((n): n is TedNoticeRaw => n !== null);

      return {
        notices: rawNotices,
        totalCount: data.totalCount ?? data.total ?? rawNotices.length,
      };
    }))!;
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
          create: { ...data, description: data.description ?? "", cpvCodes: data.cpvCodes ?? undefined },
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

  // ── Health Check ────────────────────────────────────────

  async healthCheck(): Promise<{ ok: boolean; latencyMs: number }> {
    const start = Date.now();
    try {
      const res = await fetch(
        `${TED_BASE_URL}/v3/notices/search?q=*&limit=1`,
        { headers: TED_HEADERS, signal: AbortSignal.timeout(5000) },
      );
      return { ok: res.ok, latencyMs: Date.now() - start };
    } catch {
      return { ok: false, latencyMs: Date.now() - start };
    }
  }

  // ── Private: Query Builder ──────────────────────────────

  private buildQueryParts(params: TedSearchParams): string[] {
    const parts: string[] = [];

    if (params.query) parts.push(params.query);
    // eForms v3 query syntax uses field IDs with operators
    if (params.dateFrom) {
      parts.push(`publication-date >= ${params.dateFrom.replace(/-/g, "")}`);
    }
    if (params.dateTo) {
      parts.push(`publication-date <= ${params.dateTo.replace(/-/g, "")}`);
    }

    return parts;
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
