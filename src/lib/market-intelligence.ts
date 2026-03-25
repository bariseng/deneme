/**
 * Market Intelligence & Sector Analysis Engine
 * Trend analysis, institution spending, seasonal patterns, price index, competition density
 */

import { prisma } from "@/lib/prisma";

// ─── Sector Trend Analysis ──────────────────────────────

export interface SectorTrend {
  sector: string;
  currentCount: number;
  previousCount: number;
  growthRate: number;
  currentBudget: number;
  previousBudget: number;
  budgetChange: number;
  avgBudget: number;
}

export async function getSectorTrends(months: number = 3): Promise<SectorTrend[]> {
  const now = new Date();
  const currentStart = new Date(now.getFullYear(), now.getMonth() - months, 1);
  const previousStart = new Date(now.getFullYear(), now.getMonth() - months * 2, 1);

  const sectors = ["YAPIM", "HIZMET", "MAL_ALIMI", "DANISMANLIK"];
  const trends: SectorTrend[] = [];

  for (const sector of sectors) {
    const [current, previous] = await Promise.all([
      prisma.tender.aggregate({
        where: {
          tenderType: sector as "YAPIM" | "HIZMET" | "MAL_ALIMI" | "DANISMANLIK",
          publishDate: { gte: currentStart },
        },
        _count: true,
        _sum: { estimatedCost: true },
        _avg: { estimatedCost: true },
      }),
      prisma.tender.aggregate({
        where: {
          tenderType: sector as "YAPIM" | "HIZMET" | "MAL_ALIMI" | "DANISMANLIK",
          publishDate: { gte: previousStart, lt: currentStart },
        },
        _count: true,
        _sum: { estimatedCost: true },
      }),
    ]);

    const currentCount = current._count;
    const previousCount = previous._count;
    const growthRate = previousCount > 0
      ? ((currentCount - previousCount) / previousCount) * 100
      : 0;

    const currentBudget = Number(current._sum.estimatedCost || 0);
    const previousBudget = Number(previous._sum.estimatedCost || 0);
    const budgetChange = previousBudget > 0
      ? ((currentBudget - previousBudget) / previousBudget) * 100
      : 0;

    trends.push({
      sector: getSectorLabel(sector),
      currentCount,
      previousCount,
      growthRate: Math.round(growthRate * 10) / 10,
      currentBudget,
      previousBudget,
      budgetChange: Math.round(budgetChange * 10) / 10,
      avgBudget: Number(current._avg.estimatedCost || 0),
    });
  }

  return trends;
}

// ─── Institution Spending Analysis ──────────────────────

export interface InstitutionSpending {
  institution: string;
  totalBudget: number;
  tenderCount: number;
  byType: { type: string; count: number; budget: number; percentage: number }[];
  avgBudget: number;
}

export async function getInstitutionSpending(
  limit: number = 10
): Promise<InstitutionSpending[]> {
  const tenders = await prisma.tender.groupBy({
    by: ["institution", "tenderType"],
    _count: true,
    _sum: { estimatedCost: true },
    orderBy: { _sum: { estimatedCost: "desc" } },
  });

  // Group by institution
  const institutionMap = new Map<string, {
    totalBudget: number;
    count: number;
    byType: Map<string, { count: number; budget: number }>;
  }>();

  for (const t of tenders) {
    const existing = institutionMap.get(t.institution) || {
      totalBudget: 0,
      count: 0,
      byType: new Map(),
    };

    const budget = Number(t._sum.estimatedCost || 0);
    existing.totalBudget += budget;
    existing.count += t._count;
    existing.byType.set(t.tenderType, {
      count: t._count,
      budget,
    });

    institutionMap.set(t.institution, existing);
  }

  // Sort by total budget and take top N
  const sorted = [...institutionMap.entries()]
    .sort((a, b) => b[1].totalBudget - a[1].totalBudget)
    .slice(0, limit);

  return sorted.map(([institution, data]) => {
    const byType = [...data.byType.entries()].map(([type, d]) => ({
      type: getSectorLabel(type),
      count: d.count,
      budget: d.budget,
      percentage: data.totalBudget > 0
        ? Math.round((d.budget / data.totalBudget) * 100)
        : 0,
    }));

    return {
      institution,
      totalBudget: data.totalBudget,
      tenderCount: data.count,
      byType,
      avgBudget: data.count > 0 ? data.totalBudget / data.count : 0,
    };
  });
}

// ─── Seasonal Patterns ──────────────────────────────────

export interface MonthlyPattern {
  month: number;
  monthName: string;
  count: number;
  budget: number;
}

export async function getSeasonalPatterns(
  sector?: string
): Promise<MonthlyPattern[]> {
  const tenders = await prisma.tender.findMany({
    select: { publishDate: true, estimatedCost: true, tenderType: true },
    where: sector ? { tenderType: sector as "YAPIM" | "HIZMET" | "MAL_ALIMI" | "DANISMANLIK" } : undefined,
  });

  const monthNames = [
    "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
    "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
  ];

  const monthly = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    monthName: monthNames[i],
    count: 0,
    budget: 0,
  }));

  for (const t of tenders) {
    const m = t.publishDate.getMonth();
    monthly[m].count++;
    monthly[m].budget += Number(t.estimatedCost || 0);
  }

  return monthly;
}

// ─── Price Index ────────────────────────────────────────

export interface PriceIndexData {
  sector: string;
  items: {
    item: string;
    unit: string;
    price: number;
    prevPrice: number | null;
    change: number | null;
    month: string;
  }[];
}

export async function getPriceIndex(sector?: string): Promise<PriceIndexData[]> {
  const where = sector ? { sector } : {};
  const indices = await prisma.priceIndex.findMany({
    where,
    orderBy: [{ sector: "asc" }, { month: "desc" }, { item: "asc" }],
  });

  // Group by sector
  const sectorMap = new Map<string, PriceIndexData["items"]>();

  for (const idx of indices) {
    const items = sectorMap.get(idx.sector) || [];
    // Only include latest month per item
    if (!items.find((i) => i.item === idx.item)) {
      items.push({
        item: idx.item,
        unit: idx.unit,
        price: Number(idx.price),
        prevPrice: idx.prevPrice ? Number(idx.prevPrice) : null,
        change: idx.change,
        month: idx.month,
      });
    }
    sectorMap.set(idx.sector, items);
  }

  return [...sectorMap.entries()].map(([sector, items]) => ({ sector, items }));
}

/**
 * Seed sample price index data for demo
 */
export async function seedPriceIndex(): Promise<void> {
  const month = new Date().toISOString().slice(0, 7); // "2026-03"

  const sampleData = [
    { sector: "Yapım İşleri", item: "Beton C30/37", unit: "m³", price: 2450, prevPrice: 2280, source: "Çevre Bakanlığı" },
    { sector: "Yapım İşleri", item: "Betonarme demiri", unit: "ton", price: 18500, prevPrice: 17200, source: "Piyasa Ortalaması" },
    { sector: "Yapım İşleri", item: "Kalıp işçiliği", unit: "m²", price: 380, prevPrice: 350, source: "İşçilik Birim Fiyat" },
    { sector: "Yapım İşleri", item: "Tuğla duvar", unit: "m²", price: 520, prevPrice: 490, source: "Piyasa Ortalaması" },
    { sector: "Yapım İşleri", item: "Sıva işçiliği", unit: "m²", price: 210, prevPrice: 195, source: "İşçilik Birim Fiyat" },
    { sector: "Bilişim", item: "Yazılım geliştirme", unit: "adam/gün", price: 4500, prevPrice: 4200, source: "Sektör Ortalaması" },
    { sector: "Bilişim", item: "Sunucu barındırma", unit: "ay", price: 12000, prevPrice: 11500, source: "Piyasa Ortalaması" },
    { sector: "Bilişim", item: "Teknik destek", unit: "saat", price: 650, prevPrice: 600, source: "Sektör Ortalaması" },
    { sector: "Hizmet", item: "Güvenlik personeli", unit: "kişi/ay", price: 28500, prevPrice: 26000, source: "SGK Taban" },
    { sector: "Hizmet", item: "Temizlik hizmeti", unit: "m²/ay", price: 18, prevPrice: 16.5, source: "Piyasa Ortalaması" },
  ];

  for (const d of sampleData) {
    const change = d.prevPrice ? ((d.price - d.prevPrice) / d.prevPrice) * 100 : null;
    await prisma.priceIndex.upsert({
      where: { sector_item_month: { sector: d.sector, item: d.item, month } },
      create: {
        sector: d.sector,
        item: d.item,
        unit: d.unit,
        price: d.price,
        prevPrice: d.prevPrice,
        change: change ? Math.round(change * 10) / 10 : null,
        month,
        source: d.source,
      },
      update: {
        price: d.price,
        prevPrice: d.prevPrice,
        change: change ? Math.round(change * 10) / 10 : null,
      },
    });
  }
}

// ─── Competition Density ────────────────────────────────

export interface CompetitionData {
  city: string;
  sector: string;
  avgBidders: number;
  winRate: number;
  totalTenders: number;
  totalBudget: number;
  intensity: "low" | "medium" | "high"; // < 5 bidders = low, 5-10 = medium, > 10 = high
}

export async function getCompetitionDensity(
  city?: string,
  sector?: string
): Promise<CompetitionData[]> {
  const where: Record<string, string> = {};
  if (city) where.city = city;
  if (sector) where.sector = sector;

  const data = await prisma.competitionDensity.findMany({
    where,
    orderBy: { avgBidders: "desc" },
  });

  if (data.length > 0) {
    return data.map((d) => ({
      city: d.city,
      sector: d.sector,
      avgBidders: d.avgBidders,
      winRate: d.winRate,
      totalTenders: d.totalTenders,
      totalBudget: Number(d.totalBudget),
      intensity: d.avgBidders < 5 ? "low" : d.avgBidders < 10 ? "medium" : "high",
    }));
  }

  // Generate from tender data if no cached data
  return generateCompetitionData(city, sector);
}

async function generateCompetitionData(
  filterCity?: string,
  filterSector?: string
): Promise<CompetitionData[]> {
  const cities = ["İstanbul", "Ankara", "İzmir", "Bursa", "Antalya", "Konya", "Adana", "Gaziantep"];
  const sectors = ["YAPIM", "HIZMET", "MAL_ALIMI", "DANISMANLIK"];
  const results: CompetitionData[] = [];

  const targetCities = filterCity ? [filterCity] : cities;
  const targetSectors = filterSector ? [filterSector] : sectors;

  for (const city of targetCities) {
    for (const sector of targetSectors) {
      const tenders = await prisma.tender.aggregate({
        where: {
          city,
          tenderType: sector as "YAPIM" | "HIZMET" | "MAL_ALIMI" | "DANISMANLIK",
        },
        _count: true,
        _sum: { estimatedCost: true },
      });

      if (tenders._count === 0) continue;

      // Estimate bidder count from applications
      const apps = await prisma.application.count({
        where: { tender: { city, tenderType: sector as "YAPIM" | "HIZMET" | "MAL_ALIMI" | "DANISMANLIK" } },
      });

      const avgBidders = tenders._count > 0 ? Math.max(2, Math.round((apps / tenders._count) * 10) / 10) : 3;
      const winRate = avgBidders > 0 ? Math.round((1 / avgBidders) * 1000) / 10 : 0;

      results.push({
        city,
        sector: getSectorLabel(sector),
        avgBidders,
        winRate,
        totalTenders: tenders._count,
        totalBudget: Number(tenders._sum.estimatedCost || 0),
        intensity: avgBidders < 5 ? "low" : avgBidders < 10 ? "medium" : "high",
      });
    }
  }

  return results.sort((a, b) => b.totalTenders - a.totalTenders);
}

// ─── Helpers ────────────────────────────────────────────

function getSectorLabel(type: string): string {
  const labels: Record<string, string> = {
    YAPIM: "Yapım İşleri",
    HIZMET: "Hizmet Alımı",
    MAL_ALIMI: "Mal Alımı",
    DANISMANLIK: "Danışmanlık",
  };
  return labels[type] || type;
}

export function formatBudget(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} milyar ₺`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M ₺`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K ₺`;
  return `${value.toLocaleString("tr-TR")} ₺`;
}
