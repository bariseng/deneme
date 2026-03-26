// ─── Dashboard Metrics Service ──────────────────────────────
// Real KPIs from database with caching

import { prisma } from "@/lib/prisma";
import { ProviderCache } from "@/lib/providers/cache";

const cache = new ProviderCache();
const CACHE_TTL = 300; // 5 min

// ─── Types ──────────────────────────────────────────────────

export interface DashboardKPIs {
  activeTenders: number;
  bidsSubmitted: number;
  winRate: number;
  totalContractValue: number;
  upcomingDeadlines: number;
  legalChanges: number;
  marketTrend: { direction: "up" | "down" | "stable"; percentage: number };
}

export interface MonthlyVolume {
  month: string;
  count: number;
  totalBudget: number;
}

export interface SectorDistribution {
  sector: string;
  count: number;
  percentage: number;
}

export interface CityHeatmap {
  city: string;
  count: number;
  totalBudget: number;
}

export interface PerformanceCard {
  wonTenders: number;
  totalBids: number;
  winRate: number;
  avgDiscount: number;
  totalRevenue: number;
  activeTenders: number;
}

// ─── KPI Calculation ────────────────────────────────────────

export async function getDashboardKPIs(userId: string, companyId?: string | null): Promise<DashboardKPIs> {
  const cacheKey = `dashboard_kpi:${userId}`;
  const cached = await cache.get<DashboardKPIs>(cacheKey);
  if (cached) return cached;

  const now = new Date();
  const sevenDaysLater = new Date(now.getTime() + 7 * 86400000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000);

  const [
    activeTenders,
    bidsSubmitted,
    wonBids,
    contractValue,
    upcomingDeadlines,
    legalChanges,
    currentMonthTenders,
    prevMonthTenders,
  ] = await Promise.all([
    // Active tenders from EKAP
    prisma.tender.count({ where: { status: "BASVURU_ACIK" } }),

    // User's submitted bids
    prisma.bid.count({
      where: {
        userId,
        status: { in: ["TAMAMLANDI", "GONDERILDI"] },
      },
    }),

    // Won bids (tamamlanan with matching company in results)
    companyId
      ? prisma.tenderResult.count({
          where: {
            tender: { bids: { some: { companyId } } },
            winnerName: { not: "" },
          },
        })
      : 0,

    // Total contract value
    companyId
      ? prisma.contract
          .aggregate({
            where: {
              userId,
              status: { in: ["AKTIF", "TAMAMLANDI"] },
            },
            _sum: { totalAmount: true },
          })
          .then((r) => Number(r._sum.totalAmount || 0))
      : 0,

    // Upcoming deadlines (7 days)
    prisma.tender.count({
      where: {
        deadline: { gte: now, lte: sevenDaysLater },
        status: "BASVURU_ACIK",
        favorites: { some: { userId } },
      },
    }),

    // Legal changes (last 30 days)
    prisma.legalUpdate.count({
      where: { publishDate: { gte: thirtyDaysAgo } },
    }),

    // Market trend: current 30 days vs previous 30 days
    prisma.tender.count({
      where: { publishDate: { gte: thirtyDaysAgo } },
    }),
    prisma.tender.count({
      where: { publishDate: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
    }),
  ]);

  const winRate = bidsSubmitted > 0 ? Math.round((wonBids / bidsSubmitted) * 100) : 0;

  const trendPct = prevMonthTenders > 0
    ? Math.round(((currentMonthTenders - prevMonthTenders) / prevMonthTenders) * 100)
    : 0;

  const kpis: DashboardKPIs = {
    activeTenders,
    bidsSubmitted,
    winRate,
    totalContractValue: contractValue,
    upcomingDeadlines,
    legalChanges,
    marketTrend: {
      direction: trendPct > 2 ? "up" : trendPct < -2 ? "down" : "stable",
      percentage: Math.abs(trendPct),
    },
  };

  await cache.set(cacheKey, kpis, { ttl: CACHE_TTL, staleWhileRevalidate: true, key: "dash" }, "DASHBOARD");
  return kpis;
}

// ─── Chart Data: Monthly Volume ─────────────────────────────

export async function getMonthlyVolume(months = 12): Promise<MonthlyVolume[]> {
  const cacheKey = `monthly_volume:${months}`;
  const cached = await cache.get<MonthlyVolume[]>(cacheKey);
  if (cached) return cached;

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  startDate.setDate(1);

  const tenders = await prisma.tender.findMany({
    where: { publishDate: { gte: startDate } },
    select: { publishDate: true, estimatedCost: true },
  });

  const monthMap = new Map<string, { count: number; budget: number }>();

  for (const t of tenders) {
    const key = `${t.publishDate.getFullYear()}-${String(t.publishDate.getMonth() + 1).padStart(2, "0")}`;
    const existing = monthMap.get(key) || { count: 0, budget: 0 };
    existing.count++;
    existing.budget += Number(t.estimatedCost || 0);
    monthMap.set(key, existing);
  }

  const result = [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      count: data.count,
      totalBudget: Math.round(data.budget),
    }));

  await cache.set(cacheKey, result, { ttl: CACHE_TTL, staleWhileRevalidate: true, key: "vol" }, "DASHBOARD");
  return result;
}

// ─── Chart Data: Sector Distribution ────────────────────────

export async function getSectorDistribution(): Promise<SectorDistribution[]> {
  const cacheKey = "sector_distribution";
  const cached = await cache.get<SectorDistribution[]>(cacheKey);
  if (cached) return cached;

  const tenders = await prisma.tender.groupBy({
    by: ["tenderType"],
    _count: true,
    where: { publishDate: { gte: new Date(Date.now() - 365 * 86400000) } },
  });

  const total = tenders.reduce((sum, t) => sum + t._count, 0);

  const LABELS: Record<string, string> = {
    YAPIM: "Yapım İşleri",
    MAL_ALIMI: "Mal Alımı",
    HIZMET: "Hizmet Alımı",
    DANISMANLIK: "Danışmanlık",
  };

  const result = tenders
    .map((t) => ({
      sector: LABELS[t.tenderType] || t.tenderType,
      count: t._count,
      percentage: total > 0 ? Math.round((t._count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  await cache.set(cacheKey, result, { ttl: CACHE_TTL, staleWhileRevalidate: true, key: "sec" }, "DASHBOARD");
  return result;
}

// ─── Chart Data: City Heatmap ───────────────────────────────

export async function getCityHeatmap(limit = 20): Promise<CityHeatmap[]> {
  const cacheKey = `city_heatmap:${limit}`;
  const cached = await cache.get<CityHeatmap[]>(cacheKey);
  if (cached) return cached;

  const cities = await prisma.tender.groupBy({
    by: ["city"],
    _count: true,
    _sum: { estimatedCost: true },
    where: { publishDate: { gte: new Date(Date.now() - 365 * 86400000) } },
    orderBy: { _count: { city: "desc" } },
    take: limit,
  });

  const result = cities.map((c) => ({
    city: c.city,
    count: c._count,
    totalBudget: Math.round(Number(c._sum.estimatedCost || 0)),
  }));

  await cache.set(cacheKey, result, { ttl: CACHE_TTL, staleWhileRevalidate: true, key: "city" }, "DASHBOARD");
  return result;
}

// ─── Chart Data: Price Index (from TÜİK data) ──────────────

export async function getPriceIndexChart(sector?: string): Promise<{ month: string; avg: number; min: number; max: number }[]> {
  const cacheKey = `price_index_chart:${sector || "all"}`;
  const cached = await cache.get<{ month: string; avg: number; min: number; max: number }[]>(cacheKey);
  if (cached) return cached;

  const where: Record<string, unknown> = {};
  if (sector) where.sector = sector;

  const indices = await prisma.unitPriceIndex.findMany({
    where,
    orderBy: { month: "asc" },
    take: 12,
    select: { month: true, avgPrice: true, minPrice: true, maxPrice: true },
  });

  const result = indices.map((i) => ({
    month: i.month.toISOString().slice(0, 7),
    avg: Number(i.avgPrice),
    min: Number(i.minPrice),
    max: Number(i.maxPrice),
  }));

  await cache.set(cacheKey, result, { ttl: 1800, staleWhileRevalidate: true, key: "pidx" }, "DASHBOARD");
  return result;
}

// ─── Firm Performance Scorecard ─────────────────────────────

export async function getPerformanceCard(userId: string, companyId?: string | null): Promise<PerformanceCard> {
  const cacheKey = `perf_card:${userId}`;
  const cached = await cache.get<PerformanceCard>(cacheKey);
  if (cached) return cached;

  const [totalBids, wonResults, contractAgg, activeBids] = await Promise.all([
    prisma.bid.count({
      where: { userId, status: { in: ["TAMAMLANDI", "GONDERILDI"] } },
    }),

    companyId
      ? prisma.tenderResult.findMany({
          where: {
            tender: { bids: { some: { companyId } } },
            winnerAmount: { not: 0 },
          },
          include: { tender: { select: { estimatedCost: true } } },
        })
      : [],

    prisma.contract.aggregate({
      where: { userId, status: { in: ["AKTIF", "TAMAMLANDI"] } },
      _sum: { totalAmount: true },
    }),

    prisma.bid.count({
      where: { userId, status: "GONDERILDI" },
    }),
  ]);

  // Calculate average discount from won tenders
  let avgDiscount = 0;
  if (wonResults.length > 0) {
    const discounts = wonResults
      .filter((r) => r.tender.estimatedCost && Number(r.tender.estimatedCost) > 0)
      .map((r) => {
        const est = Number(r.tender.estimatedCost);
        const won = Number(r.winnerAmount);
        return ((est - won) / est) * 100;
      });
    avgDiscount = discounts.length > 0
      ? Math.round(discounts.reduce((a, b) => a + b, 0) / discounts.length)
      : 0;
  }

  const card: PerformanceCard = {
    wonTenders: wonResults.length,
    totalBids,
    winRate: totalBids > 0 ? Math.round((wonResults.length / totalBids) * 100) : 0,
    avgDiscount,
    totalRevenue: Number(contractAgg._sum.totalAmount || 0),
    activeTenders: activeBids,
  };

  await cache.set(cacheKey, card, { ttl: CACHE_TTL, staleWhileRevalidate: true, key: "perf" }, "DASHBOARD");
  return card;
}
