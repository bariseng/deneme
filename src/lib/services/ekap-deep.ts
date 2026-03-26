// ─── EKAP Deep Integration ──────────────────────────────────
// Document download, result tracking, ban check, calendar sync

import { prisma } from "@/lib/prisma";
import { ekapProvider } from "@/lib/providers/ekap-provider";
import { ProviderCache } from "@/lib/providers/cache";

const cache = new ProviderCache();

// ─── Types ──────────────────────────────────────────────────

interface EkapDocument {
  name: string;
  url: string;
  type: string;
  size?: string;
}

interface EkapResult {
  tenderId: string;
  winnerName: string;
  winnerAmount: number;
  totalBidders: number;
  resultDate: Date;
  notes?: string;
}

interface BanCheckResult {
  isBanned: boolean;
  banDetails: { reason: string; startDate: string; endDate: string; institution: string }[];
}

interface TenderCalendarItem {
  id: string;
  title: string;
  institution: string;
  city: string;
  deadline: Date;
  openingDate: Date | null;
  tenderType: string;
  status: string;
}

// ─── Document Download ──────────────────────────────────────

export async function getDocumentList(tenderId: string): Promise<EkapDocument[]> {
  const cacheKey = `ekap_docs:${tenderId}`;
  const cached = await cache.get<EkapDocument[]>(cacheKey);
  if (cached) return cached;

  const tender = await prisma.tender.findUnique({
    where: { id: tenderId },
    select: { ekapNo: true },
  });
  if (!tender?.ekapNo) return [];

  try {
    const ihaleId = parseInt(tender.ekapNo);
    const docUrl = await ekapProvider.getDocumentUrl(ihaleId);

    // Standard EKAP document set
    const documents: EkapDocument[] = [
      { name: "İhale İlanı", url: docUrl || "", type: "ilan" },
      { name: "İdari Şartname", url: docUrl ? `${docUrl}&belge=idari` : "", type: "idari_sartname" },
      { name: "Teknik Şartname", url: docUrl ? `${docUrl}&belge=teknik` : "", type: "teknik_sartname" },
      { name: "Sözleşme Tasarısı", url: docUrl ? `${docUrl}&belge=sozlesme` : "", type: "sozlesme_taslagi" },
      { name: "Standart Formlar", url: docUrl ? `${docUrl}&belge=formlar` : "", type: "standart_formlar" },
    ].filter((d) => d.url.length > 0);

    await cache.set(cacheKey, documents, { ttl: 3600, staleWhileRevalidate: true, key: "edoc" }, "EKAP");
    return documents;
  } catch {
    return [];
  }
}

export async function getDocumentDownloadUrl(tenderId: string, docType: string): Promise<string | null> {
  const docs = await getDocumentList(tenderId);
  const doc = docs.find((d) => d.type === docType);
  return doc?.url || null;
}

// ─── Result Tracking ────────────────────────────────────────

export async function trackResults(tenderId: string): Promise<EkapResult | null> {
  const tender = await prisma.tender.findUnique({
    where: { id: tenderId },
    select: { ekapNo: true, id: true },
  });
  if (!tender?.ekapNo) return null;

  try {
    const ihaleId = parseInt(tender.ekapNo);
    const detail = await ekapProvider.getTenderDetail(ihaleId);
    if (!detail) return null;

    // Check if tender has result (status = SONUCLANDI)
    if (detail.ihaleDurumId !== 3) return null;

    const raw = detail as unknown as Record<string, unknown>;
    const result: EkapResult = {
      tenderId: tender.id,
      winnerName: (raw.kazananFirma as string) || "",
      winnerAmount: Number(raw.kazananTutar || 0),
      totalBidders: Number(raw.toplamTeklif || 0),
      resultDate: new Date(detail.ihaleTarihi),
      notes: (raw.sonucAciklama as string) || undefined,
    };

    // Upsert to TenderResult
    if (result.winnerName) {
      await prisma.tenderResult.upsert({
        where: { id: `ekap_result_${tender.id}` },
        create: {
          id: `ekap_result_${tender.id}`,
          tenderId: tender.id,
          winnerName: result.winnerName,
          winnerAmount: result.winnerAmount,
          totalBidders: result.totalBidders,
          resultDate: result.resultDate,
          notes: result.notes,
        },
        update: {
          winnerName: result.winnerName,
          winnerAmount: result.winnerAmount,
          totalBidders: result.totalBidders,
          notes: result.notes,
        },
      });

      // Update tender status
      await prisma.tender.update({
        where: { id: tender.id },
        data: { status: "SONUCLANDI" },
      });
    }

    return result;
  } catch {
    return null;
  }
}

// ─── Ban Check (Yasaklılık Sorgusu) ────────────────────────

export async function checkBanStatus(companyName: string, taxNumber?: string): Promise<BanCheckResult> {
  const cacheKey = `ban_check:${taxNumber || companyName}`;
  const cached = await cache.get<BanCheckResult>(cacheKey);
  if (cached) return cached;

  try {
    // Search EKAP for ban records using tender search with company name
    const searchResult = await ekapProvider.searchTenders({
      searchText: companyName,
      ihaleDurumIdList: [4], // IPTAL status may contain ban info
      sayfaBoyutu: 5,
    });

    // Check if company appears in cancelled/banned tenders
    const banDetails: BanCheckResult["banDetails"] = [];

    // In production: EKAP has a dedicated yasaklilik endpoint
    // For now: search results for ban indicators
    for (const tender of searchResult.list) {
      const desc = (tender.aciklama || "").toLowerCase();
      if (desc.includes("yasaklama") || desc.includes("yasaklılık")) {
        banDetails.push({
          reason: tender.aciklama || "Yasaklama kararı",
          startDate: tender.ihaleTarihi,
          endDate: "",
          institution: tender.idareAdi,
        });
      }
    }

    const result: BanCheckResult = {
      isBanned: banDetails.length > 0,
      banDetails,
    };

    await cache.set(cacheKey, result, { ttl: 86400, staleWhileRevalidate: true, key: "ban" }, "EKAP");
    return result;
  } catch {
    return { isBanned: false, banDetails: [] };
  }
}

// ─── Calendar Sync ──────────────────────────────────────────

export async function getEkapCalendar(
  userId: string,
  daysAhead = 30,
): Promise<TenderCalendarItem[]> {
  const now = new Date();
  const future = new Date(now.getTime() + daysAhead * 86400_000);

  const tenders = await prisma.tender.findMany({
    where: {
      source: "EKAP",
      deadline: { gte: now, lte: future },
      OR: [
        { favorites: { some: { userId } } },
        { bids: { some: { userId } } },
      ],
    },
    select: {
      id: true, title: true, institution: true, city: true,
      deadline: true, openingDate: true, tenderType: true, status: true,
    },
    orderBy: { deadline: "asc" },
  });

  return tenders.map((t) => ({
    id: t.id,
    title: t.title,
    institution: t.institution,
    city: t.city,
    deadline: t.deadline,
    openingDate: t.openingDate,
    tenderType: t.tenderType,
    status: t.status,
  }));
}

// ─── Batch Result Scan ──────────────────────────────────────

export async function scanForNewResults(limit = 50): Promise<{ scanned: number; newResults: number }> {
  const pendingTenders = await prisma.tender.findMany({
    where: {
      source: "EKAP",
      status: { in: ["DEGERLENDIRME", "BASVURU_ACIK"] },
      ekapNo: { not: null },
    },
    select: { id: true },
    take: limit,
  });

  let newResults = 0;
  for (const tender of pendingTenders) {
    const result = await trackResults(tender.id);
    if (result) newResults++;
  }

  return { scanned: pendingTenders.length, newResults };
}
