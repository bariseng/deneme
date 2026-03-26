// ─── EKAP v2 JSON API Provider ──────────────────────────────

import { prisma } from "@/lib/prisma";
import { ekapLimiter } from "./rate-limiter";
import { ProviderCache } from "./cache";
import type { SyncLogResult } from "./types";

// ─── EKAP API Types ─────────────────────────────────────────

export interface EkapSearchParams {
  searchText?: string;
  iknYili?: number | null;
  iknSayi?: number | null;
  ihaleTarihBaslangic?: string | null;
  ihaleTarihBitis?: string | null;
  ihaleTarihSaatBaslangic?: string | null;
  ihaleTarihSaatBitis?: string | null;
  ilanTarihSaatBaslangic?: string | null;
  ilanTarihSaatBitis?: string | null;
  ihaleDurumIdList?: number[];
  ihaleTuruIdList?: number[];
  ihaleUsulIdList?: number[];
  ihaleUsulAltIdList?: number[];
  ilIdList?: number[];
  ihaleIlIdList?: number[];
  okasKodList?: string[];
  okasBransKodList?: string[];
  okasBransAdiList?: string[];
  kurumIdList?: number[];
  idareKodList?: number[];
  idareIdList?: number[];
  eIhale?: boolean | null;
  ortakAlimMi?: boolean | null;
  kismiTeklifMi?: boolean | null;
  yabanciIsteklilereIzinVeriliyorMu?: boolean | null;
  /** Pagination: 0-based skip (new v2 format) */
  paginationSkip?: number;
  /** Pagination: page size (new v2 format) */
  paginationTake?: number;
  /** @deprecated Use paginationSkip/paginationTake instead */
  sayfaNo?: number;
  /** @deprecated Use paginationTake instead */
  sayfaBoyutu?: number;
}

export interface EkapTenderRaw {
  /** Encrypted hash ID from v2 API */
  id?: string;
  /** Numeric ID (legacy) */
  ihaleId?: number;
  ihaleAdi: string;
  /** IKN in "YYYY/NNNNNN" format */
  ikn?: string;
  iknYili?: number;
  iknSayi?: number;
  idareAdi: string;
  /** v2 field name for city */
  ihaleIlAdi?: string;
  /** legacy field name */
  il?: string;
  ilce?: string;
  /** v2: "28.04.2026 10:30" format */
  ihaleTarihSaat?: string;
  /** legacy: ISO date */
  ihaleTarihi?: string;
  yaklesikMaliyet?: number;
  /** v2: numeric code "1","2","3","4" */
  ihaleTip?: string;
  ihaleTipAciklama?: string;
  ihaleTuru?: string;
  /** v2: numeric code "1","2","3","4","5" */
  ihaleDurum?: string;
  ihaleDurumAciklama?: string;
  ihaleDurumId?: number;
  ihaleDurumu?: string;
  eIhale?: boolean;
  yabanciIsteklilereIzinVeriliyorMu?: boolean;
  kismiTeklifMi?: boolean;
  ortakAlimMi?: boolean;
  ilanTuru?: string;
  ilanTarihi?: string;
  ilanVarMi?: boolean;
  okasKodlar?: string[];
  aciklama?: string;
  teminatOrani?: number;
  iletisimAdi?: string;
  iletisimTelefon?: string;
  iletisimEposta?: string;
  dokumanSayisi?: number;
  ihaleUsulAciklama?: string;
}

interface EkapListResponse {
  list: EkapTenderRaw[];
  totalCount: number;
}

// ─── Mapping Helpers ────────────────────────────────────────

// v2 API returns ihaleTip as string number: "1"=Mal, "2"=Yapım, "3"=Hizmet, "4"=Danışmanlık
const TENDER_TYPE_MAP: Record<string, string> = {
  "1": "MAL_ALIMI",
  "2": "YAPIM",
  "3": "HIZMET",
  "4": "DANISMANLIK",
  "Yapım": "YAPIM",
  "Mal Alımı": "MAL_ALIMI",
  "Hizmet Alımı": "HIZMET",
  "Hizmet": "HIZMET",
  "Danışmanlık Hizmet Alımı": "DANISMANLIK",
};

// v2 API returns ihaleDurum as string number
const STATUS_MAP: Record<string, string> = {
  "1": "YAKLASAN",
  "2": "BASVURU_ACIK",
  "3": "DEGERLENDIRME",
  "4": "SONUCLANDI",
  "5": "IPTAL",
};

type TenderType = "YAPIM" | "MAL_ALIMI" | "HIZMET" | "DANISMANLIK";
type TenderStatus = "BASVURU_ACIK" | "DEGERLENDIRME" | "SONUCLANDI" | "IPTAL" | "YAKLASAN";

function mapTenderType(ekapType?: string): TenderType {
  if (!ekapType) return "HIZMET";
  return (TENDER_TYPE_MAP[ekapType] ?? "HIZMET") as TenderType;
}

function mapStatus(durumCode?: string | number): TenderStatus {
  if (!durumCode) return "BASVURU_ACIK";
  const key = String(durumCode);
  return (STATUS_MAP[key] ?? "BASVURU_ACIK") as TenderStatus;
}

/** Parse "28.04.2026 10:30" → Date */
function parseEkapDate(dateStr?: string): Date {
  if (!dateStr) return new Date();
  // Try dd.MM.yyyy HH:mm format
  const match = dateStr.match(/^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})$/);
  if (match) {
    const [, day, month, year, hour, minute] = match;
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:00`);
  }
  // Fallback: try ISO parse
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date() : d;
}

// ─── Constants ──────────────────────────────────────────────

const BASE_URL =
  process.env.EKAP_BASE_URL || "https://ekapv2.kik.gov.tr";

const EKAP_HEADERS: Record<string, string> = {
  Accept: "application/json",
  "Content-Type": "application/json",
  "api-version": "v1",
  Origin: "https://ekapv2.kik.gov.tr",
  Referer: "https://ekapv2.kik.gov.tr/ekap/search",
  "Accept-Language": "tr",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
  "sec-ch-ua": '"Chromium";v="138", "Google Chrome";v="138"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"macOS"',
};

const CACHE_TTL_SEARCH = 3600; // 1 hour
const CACHE_TTL_DETAIL = 86400; // 24 hours
const BATCH_SIZE = 100;

// ─── EKAP Provider Class ───────────────────────────────────

export class EkapProvider {
  private readonly cache: ProviderCache;

  constructor() {
    this.cache = new ProviderCache();
  }

  // ── Search Tenders ────────────────────────────────────────

  async searchTenders(
    params: Partial<EkapSearchParams> = {},
  ): Promise<EkapListResponse> {
    // Convert legacy sayfaNo/sayfaBoyutu to paginationSkip/paginationTake
    const pageSize = params.paginationTake ?? params.sayfaBoyutu ?? 50;
    const skip = params.paginationSkip ?? ((params.sayfaNo ?? 1) - 1) * pageSize;

    const body = {
      searchText: params.searchText ?? "",
      filterType: null,
      ikNdeAra: true,
      ihaleAdindaAra: true,
      searchType: "GirdigimGibi" as const,
      iknYili: params.iknYili ?? null,
      iknSayi: params.iknSayi ?? null,
      // CRITICAL: tarih alanları null olursa EKAP list boş döndürür — her zaman geniş aralık gönder
      ihaleTarihSaatBaslangic: params.ihaleTarihSaatBaslangic ?? params.ihaleTarihBaslangic ?? "2003-01-01T00:00:00.000Z",
      ihaleTarihSaatBitis: params.ihaleTarihSaatBitis ?? params.ihaleTarihBitis ?? new Date(Date.now() + 365 * 86400000).toISOString(),
      ilanTarihSaatBaslangic: params.ilanTarihSaatBaslangic ?? null,
      ilanTarihSaatBitis: params.ilanTarihSaatBitis ?? null,
      idareKodList: params.idareKodList ?? [],
      yasaKapsami4734List: [] as number[],
      ihaleTuruIdList: params.ihaleTuruIdList ?? [],
      ihaleUsulIdList: params.ihaleUsulIdList ?? [],
      ihaleUsulAltIdList: params.ihaleUsulAltIdList ?? [],
      ihaleIlIdList: params.ihaleIlIdList ?? params.ilIdList ?? [],
      ihaleDurumIdList: params.ihaleDurumIdList ?? [],
      idareIdList: params.idareIdList ?? [],
      ihaleIlanTuruIdList: [] as number[],
      teklifTuruIdList: [] as number[],
      asiriDusukTeklifIdList: [] as number[],
      istisnaMaddeIdList: [] as number[],
      okasBransKodList: params.okasBransKodList ?? params.okasKodList ?? [],
      okasBransAdiList: params.okasBransAdiList ?? [],
      titubbKodList: [] as string[],
      gmdnKodList: [] as string[],
      eIhale: params.eIhale ?? null,
      ortakAlimMi: params.ortakAlimMi ?? null,
      kismiTeklifMi: params.kismiTeklifMi ?? null,
      yabanciIsteklilereIzinVeriliyorMu: params.yabanciIsteklilereIzinVeriliyorMu ?? null,
      orderBy: "ihaleTarihi",
      siralamaTipi: "desc",
      paginationSkip: skip,
      paginationTake: pageSize,
    };

    const cacheKey = `ekap:search:${JSON.stringify(body)}`;
    const cached = await this.cache.get<EkapListResponse>(cacheKey);
    if (cached) return cached;

    await ekapLimiter.acquire();

    try {
      const result = await this.postApi<EkapListResponse>(
        "/b_ihalearama/api/Ihale/GetListByParameters",
        body as unknown as Record<string, unknown>,
      );

      await this.cache.set(
        cacheKey,
        result,
        { ttl: CACHE_TTL_SEARCH, staleWhileRevalidate: true, key: cacheKey },
        "EKAP",
      );
      return result;
    } catch (error) {
      // Return empty on error — cache fallback already checked above
      console.error("[EKAP] searchTenders failed:", error);
      return { list: [], totalCount: 0 };
    }
  }

  // ── Get Tender Detail ─────────────────────────────────────

  async getTenderDetail(ihaleId: number): Promise<EkapTenderRaw | null> {
    const cacheKey = `ekap:detail:${ihaleId}`;
    const cached = await this.cache.get<EkapTenderRaw>(cacheKey);
    if (cached) return cached;

    await ekapLimiter.acquire();

    try {
      const result = await this.postApi<EkapTenderRaw>(
        "/b_ihalearama/api/IhaleDetay/GetByIhaleIdIhaleDetay",
        { ihaleId },
      );

      if (!result) return null;

      await this.cache.set(
        cacheKey,
        result,
        { ttl: CACHE_TTL_DETAIL, staleWhileRevalidate: true, key: cacheKey },
        "EKAP",
      );
      return result;
    } catch (error) {
      console.error("[EKAP] getTenderDetail failed:", error);
      return null;
    }
  }

  // ── Batch Upsert ──────────────────────────────────────────

  async batchUpsert(
    tenders: EkapTenderRaw[],
  ): Promise<{ inserted: number; updated: number; errors: number }> {
    let inserted = 0;
    let updated = 0;
    let errors = 0;

    for (let i = 0; i < tenders.length; i += BATCH_SIZE) {
      const batch = tenders.slice(i, i + BATCH_SIZE);
      const ekapNos = batch.map((t) => `${t.iknYili}/${t.iknSayi}`);

      const existing = await prisma.tender.findMany({
        where: { ekapNo: { in: ekapNos } },
        select: { ekapNo: true },
      });
      const existingSet = new Set(
        existing.map((e) => e.ekapNo).filter(Boolean),
      );

      for (const raw of batch) {
        try {
          const data = this.mapToTenderData(raw);
          const isUpdate = existingSet.has(data.ekapNo);

          await prisma.tender.upsert({
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
              guaranteeRate: data.guaranteeRate,
            },
            create: data,
          });

          if (isUpdate) {
            updated++;
          } else {
            inserted++;
          }
        } catch (err) {
          console.error("[EKAP] upsert error:", err);
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
  ): Promise<SyncLogResult> {
    const startedAt = new Date();
    const log = await prisma.dataSyncLog.create({
      data: {
        provider: "EKAP",
        operation,
        status: "RUNNING",
        startedAt,
      },
    });

    try {
      const recordCount = await fn();
      const completedAt = new Date();
      const durationMs = completedAt.getTime() - startedAt.getTime();

      await prisma.dataSyncLog.update({
        where: { id: log.id },
        data: { status: "COMPLETED", recordCount, completedAt },
      });

      return { status: "COMPLETED", recordCount, durationMs };
    } catch (error) {
      const completedAt = new Date();
      const durationMs = completedAt.getTime() - startedAt.getTime();
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      await prisma.dataSyncLog.update({
        where: { id: log.id },
        data: { status: "FAILED", errorMessage, completedAt },
      });

      return {
        status: "FAILED",
        recordCount: 0,
        durationMs,
        error: errorMessage,
      };
    }
  }

  // ── Tender Mapping ────────────────────────────────────────

  private mapToTenderData(raw: EkapTenderRaw) {
    // v2 API returns ikn as "YYYY/NNNNNN", legacy uses iknYili/iknSayi
    const ekapNo = raw.ikn ?? (raw.iknYili && raw.iknSayi ? `${raw.iknYili}/${raw.iknSayi}` : null);
    if (!ekapNo) throw new Error("Missing IKN in tender data");

    // v2: ihaleIlAdi, legacy: il
    const city = raw.ihaleIlAdi ?? raw.il ?? "";
    // v2: ihaleTip ("2"), legacy: ihaleTuru ("Yapım")
    const tenderType = mapTenderType(raw.ihaleTip ?? raw.ihaleTipAciklama ?? raw.ihaleTuru);
    // v2: ihaleDurum ("2"), legacy: ihaleDurumId (2)
    const status = mapStatus(raw.ihaleDurum ?? raw.ihaleDurumId);
    // v2: ihaleTarihSaat ("28.04.2026 10:30"), legacy: ihaleTarihi (ISO)
    const deadline = parseEkapDate(raw.ihaleTarihSaat ?? raw.ihaleTarihi);

    return {
      ekapNo,
      title: raw.ihaleAdi,
      institution: raw.idareAdi,
      city,
      district: raw.ilce ?? null,
      tenderType,
      status,
      deadline,
      publishDate: raw.ilanTarihi ? new Date(raw.ilanTarihi) : new Date(),
      estimatedCost: raw.yaklesikMaliyet ?? null,
      guaranteeRate: raw.teminatOrani ?? null,
      description: raw.aciklama ?? null,
      source: "EKAP" as const,
      eIhale: raw.eIhale ?? false,
      foreignAllowed: raw.yabanciIsteklilereIzinVeriliyorMu ?? false,
      partialBid: raw.kismiTeklifMi ?? false,
      jointPurchase: raw.ortakAlimMi ?? false,
      announcementType: raw.ilanTuru ?? null,
      oksCodes: raw.okasKodlar
        ? (JSON.parse(JSON.stringify(raw.okasKodlar)) as string[])
        : undefined,
      contactPerson: raw.iletisimAdi ?? null,
      contactPhone: raw.iletisimTelefon ?? null,
      contactEmail: raw.iletisimEposta ?? null,
    };
  }

  // ── Private API Helper ────────────────────────────────────

  private async postApi<T>(
    path: string,
    body: Record<string, unknown>,
  ): Promise<T> {
    const url = `${BASE_URL}${path}`;
    const res = await fetch(url, {
      method: "POST",
      headers: EKAP_HEADERS,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      throw new Error(`EKAP API error: ${res.status} ${res.statusText}`);
    }

    return res.json() as Promise<T>;
  }
}

// ─── Singleton Instance ─────────────────────────────────────

const globalForEkap = globalThis as unknown as {
  ekapProvider?: EkapProvider;
};

export const ekapProvider =
  globalForEkap.ekapProvider ?? new EkapProvider();

if (process.env.NODE_ENV !== "production") {
  globalForEkap.ekapProvider = ekapProvider;
}
