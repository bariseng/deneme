// ─── Rakip Analizi Servisi ───────────────────────────────────

import { prisma } from "@/lib/prisma";

// ─── Types ──────────────────────────────────────────────────

export interface CompetitorInsight {
  name: string;
  taxNumber: string | null;
  totalBids: number;
  totalWins: number;
  winRate: number;
  avgBidAmount: number;
  totalAmount: number;
  cities: string[];
  sectors: string[];
  lastActivity: Date | null;
}

export interface CompetitorTrend {
  year: number;
  bids: number;
  wins: number;
  totalAmount: number;
}

export interface OkasCompetitorGroup {
  okasCode: string;
  description: string;
  competitors: CompetitorInsight[];
  avgWinRate: number;
  avgBidAmount: number;
}

// ─── EKAP Sonuç İlanlarından Rakip Çıkarma ─────────────────

/**
 * Analiz: bir firmanın aynı ihalelerde karşılaştığı rakipler.
 * EKAP sonuç ilanları + ihale sonuçlarından çıkarılır.
 */
export async function getCompetitorsForCompany(
  companyId: string,
): Promise<CompetitorInsight[]> {
  // Get company's participated tenders
  const companyBids = await prisma.bid.findMany({
    where: { companyId },
    select: { tenderId: true },
  });

  if (companyBids.length === 0) return [];

  const tenderIds = companyBids.map((b) => b.tenderId);

  // Find other companies that bid on the same tenders
  const rivalBids = await prisma.bid.findMany({
    where: {
      tenderId: { in: tenderIds },
      companyId: { not: companyId },
    },
    include: {
      company: { select: { name: true, taxNumber: true, city: true, sector: true } },
      tender: { select: { city: true } },
    },
  });

  // Aggregate by company
  const competitorMap = new Map<string, {
    name: string;
    taxNumber: string | null;
    bids: number;
    wins: number;
    totalAmount: number;
    amounts: number[];
    cities: Set<string>;
    sectors: Set<string>;
    lastDate: Date | null;
  }>();

  for (const bid of rivalBids) {
    if (!bid.company) continue;
    const key = bid.company.taxNumber || bid.company.name;
    const existing = competitorMap.get(key);

    const amount = Number(bid.totalAmount || 0);

    if (existing) {
      existing.bids++;
      if (bid.status === "GONDERILDI") existing.wins++;
      existing.totalAmount += amount;
      existing.amounts.push(amount);
      if (bid.tender?.city) existing.cities.add(bid.tender.city);
      if (bid.company.sector) existing.sectors.add(bid.company.sector);
    } else {
      competitorMap.set(key, {
        name: bid.company.name,
        taxNumber: bid.company.taxNumber,
        bids: 1,
        wins: bid.status === "GONDERILDI" ? 1 : 0,
        totalAmount: amount,
        amounts: [amount],
        cities: new Set(bid.tender?.city ? [bid.tender.city] : []),
        sectors: new Set(bid.company.sector ? [bid.company.sector] : []),
        lastDate: bid.createdAt,
      });
    }
  }

  return Array.from(competitorMap.values())
    .map((c) => ({
      name: c.name,
      taxNumber: c.taxNumber,
      totalBids: c.bids,
      totalWins: c.wins,
      winRate: c.bids > 0 ? Math.round((c.wins / c.bids) * 100) : 0,
      avgBidAmount: c.amounts.length > 0
        ? Math.round(c.amounts.reduce((a, b) => a + b, 0) / c.amounts.length)
        : 0,
      totalAmount: Math.round(c.totalAmount),
      cities: Array.from(c.cities),
      sectors: Array.from(c.sectors),
      lastActivity: c.lastDate,
    }))
    .sort((a, b) => b.totalBids - a.totalBids);
}

// ─── OKAS Kod Bazlı Rakip Grupları ─────────────────────────

/**
 * Aynı OKAS (sektör) kodlarında teklif veren firmaları grupla.
 */
export async function getCompetitorsByOkas(
  companyId: string,
): Promise<OkasCompetitorGroup[]> {
  // Get company's bids with tender OKAS codes
  const companyBids = await prisma.bid.findMany({
    where: { companyId },
    include: {
      tender: { select: { id: true, oksCodes: true, title: true } },
    },
  });

  // Collect OKAS codes
  const okasMap = new Map<string, Set<string>>();
  for (const bid of companyBids) {
    const codes = bid.tender?.oksCodes;
    if (!codes || !Array.isArray(codes)) continue;
    for (const code of codes as string[]) {
      const existing = okasMap.get(code) ?? new Set<string>();
      existing.add(bid.tender.id);
      okasMap.set(code, existing);
    }
  }

  const groups: OkasCompetitorGroup[] = [];

  for (const [okasCode, tenderIds] of okasMap.entries()) {
    // Find competitors in these tenders
    const rivals = await prisma.bid.findMany({
      where: {
        tenderId: { in: Array.from(tenderIds) },
        companyId: { not: companyId },
      },
      include: {
        company: { select: { name: true, taxNumber: true } },
      },
    });

    const rivalMap = new Map<string, { name: string; taxNumber: string | null; bids: number; wins: number; amounts: number[] }>();
    for (const bid of rivals) {
      if (!bid.company) continue;
      const key = bid.company.taxNumber || bid.company.name;
      const ex = rivalMap.get(key);
      const amount = Number(bid.totalAmount || 0);
      if (ex) {
        ex.bids++;
        if (bid.status === "GONDERILDI") ex.wins++;
        ex.amounts.push(amount);
      } else {
        rivalMap.set(key, {
          name: bid.company.name,
          taxNumber: bid.company.taxNumber,
          bids: 1,
          wins: bid.status === "GONDERILDI" ? 1 : 0,
          amounts: [amount],
        });
      }
    }

    const competitors: CompetitorInsight[] = Array.from(rivalMap.values())
      .map((c) => ({
        name: c.name,
        taxNumber: c.taxNumber,
        totalBids: c.bids,
        totalWins: c.wins,
        winRate: c.bids > 0 ? Math.round((c.wins / c.bids) * 100) : 0,
        avgBidAmount: c.amounts.length > 0
          ? Math.round(c.amounts.reduce((a, b) => a + b, 0) / c.amounts.length)
          : 0,
        totalAmount: Math.round(c.amounts.reduce((a, b) => a + b, 0)),
        cities: [],
        sectors: [],
        lastActivity: null,
      }))
      .sort((a, b) => b.totalBids - a.totalBids)
      .slice(0, 20);

    if (competitors.length > 0) {
      groups.push({
        okasCode,
        description: okasCode, // can be enriched with OKAS mapping
        competitors,
        avgWinRate: Math.round(
          competitors.reduce((s, c) => s + c.winRate, 0) / competitors.length,
        ),
        avgBidAmount: Math.round(
          competitors.reduce((s, c) => s + c.avgBidAmount, 0) / competitors.length,
        ),
      });
    }
  }

  return groups.sort((a, b) => b.competitors.length - a.competitors.length);
}

// ─── Rakip Trend Analizi ────────────────────────────────────

export async function getCompetitorTrend(
  competitorTaxNumber: string,
): Promise<CompetitorTrend[]> {
  const experiences = await prisma.competitorExperience.findMany({
    where: {
      competitor: { taxNumber: competitorTaxNumber },
    },
    select: { year: true, amount: true, isWon: true },
    orderBy: { year: "asc" },
  });

  const yearMap = new Map<number, { bids: number; wins: number; total: number }>();
  for (const exp of experiences) {
    const existing = yearMap.get(exp.year) ?? { bids: 0, wins: 0, total: 0 };
    existing.bids++;
    if (exp.isWon) existing.wins++;
    existing.total += Number(exp.amount);
    yearMap.set(exp.year, existing);
  }

  return Array.from(yearMap.entries())
    .map(([year, data]) => ({
      year,
      bids: data.bids,
      wins: data.wins,
      totalAmount: Math.round(data.total),
    }))
    .sort((a, b) => a.year - b.year);
}
