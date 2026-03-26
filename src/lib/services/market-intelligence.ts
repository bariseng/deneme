// ─── Pazar İstihbarat Servisi ──────────────────────────────
// Sektör trend analizi, rakip hareket takibi, fiyat trendi, AI özet rapor

import { prisma } from "@/lib/prisma";
import { complete } from "@/lib/providers/ai-provider";
import { useAICredit } from "@/lib/quota";

// ─── Types ──────────────────────────────────────────────────

export interface MarketReport {
  period: { start: string; end: string };
  overview: string;
  sectorAnalysis: SectorTrend[];
  priceAnalysis: PriceAnalysis;
  competitorInsights: CompetitorInsight[];
  aiSummary: string;
  recommendations: string[];
}

export interface SectorTrend {
  sector: string;
  tenderCount: number;
  totalBudget: number;
  avgBudget: number;
  trend: "YUKSELIS" | "DUSUS" | "SABIT";
  changePercent: number;
}

export interface PriceAnalysis {
  avgDiscount: number; // vs estimated cost
  minDiscount: number;
  maxDiscount: number;
  avgWinnerPrice: number;
  priceRange: { min: number; max: number };
}

export interface CompetitorInsight {
  companyName: string;
  winCount: number;
  totalBidAmount: number;
  avgDiscount: number;
  sectors: string[];
  cities: string[];
}

// ─── Market Report Generation ───────────────────────────────

export async function generateMarketReport(
  userId: string,
  options: {
    sectors?: string[];
    cities?: string[];
    period?: number; // days, default 30
  } = {},
): Promise<MarketReport> {
  const credit = await useAICredit(userId, "summary", "Pazar istihbarat raporu");
  if (!credit.success) {
    throw new Error(credit.message || "AI kredi limiti doldu");
  }

  const periodDays = options.period || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - periodDays);

  const [sectorAnalysis, priceAnalysis, competitorInsights] = await Promise.all([
    analyzeSectorTrends(startDate, options.sectors, options.cities),
    analyzePriceTrends(startDate, options.sectors, options.cities),
    analyzeCompetitors(startDate, options.sectors, options.cities),
  ]);

  // Generate AI summary
  const aiSummary = await generateAISummary(sectorAnalysis, priceAnalysis, competitorInsights);

  return {
    period: { start: startDate.toISOString(), end: new Date().toISOString() },
    overview: buildOverview(sectorAnalysis, priceAnalysis),
    sectorAnalysis,
    priceAnalysis,
    competitorInsights,
    aiSummary: aiSummary.text,
    recommendations: aiSummary.recommendations,
  };
}

// ─── Sector Analysis ────────────────────────────────────────

async function analyzeSectorTrends(
  startDate: Date,
  sectors?: string[],
  cities?: string[],
): Promise<SectorTrend[]> {
  const where: Record<string, unknown> = {
    publishDate: { gte: startDate },
  };
  if (sectors?.length) where.tenderType = { in: sectors };
  if (cities?.length) where.city = { in: cities };

  const tenders = await prisma.tender.findMany({
    where,
    select: {
      tenderType: true,
      estimatedCost: true,
      publishDate: true,
    },
  });

  // Previous period for trend comparison
  const prevStart = new Date(startDate);
  const periodDays = Math.ceil((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  prevStart.setDate(prevStart.getDate() - periodDays);

  const prevTenders = await prisma.tender.findMany({
    where: {
      ...where,
      publishDate: { gte: prevStart, lt: startDate },
    },
    select: { tenderType: true, estimatedCost: true },
  });

  // Group by sector
  const currentByType: Record<string, { count: number; budget: number }> = {};
  for (const t of tenders) {
    const type = t.tenderType || "DİĞER";
    if (!currentByType[type]) currentByType[type] = { count: 0, budget: 0 };
    currentByType[type].count++;
    currentByType[type].budget += Number(t.estimatedCost || 0);
  }

  const prevByType: Record<string, number> = {};
  for (const t of prevTenders) {
    const type = t.tenderType || "DİĞER";
    prevByType[type] = (prevByType[type] || 0) + 1;
  }

  return Object.entries(currentByType)
    .map(([sector, data]) => {
      const prevCount = prevByType[sector] || 0;
      const changePercent = prevCount > 0
        ? Math.round(((data.count - prevCount) / prevCount) * 100)
        : 100;
      const trend: SectorTrend["trend"] = changePercent > 10 ? "YUKSELIS" : changePercent < -10 ? "DUSUS" : "SABIT";

      return {
        sector,
        tenderCount: data.count,
        totalBudget: data.budget,
        avgBudget: data.count > 0 ? Math.round(data.budget / data.count) : 0,
        trend,
        changePercent,
      };
    })
    .sort((a, b) => b.tenderCount - a.tenderCount)
    .slice(0, 10);
}

// ─── Price Analysis ─────────────────────────────────────────

async function analyzePriceTrends(
  startDate: Date,
  sectors?: string[],
  cities?: string[],
): Promise<PriceAnalysis> {
  const tenderWhere: Record<string, unknown> = {};
  if (sectors?.length) tenderWhere.tenderType = { in: sectors };
  if (cities?.length) tenderWhere.city = { in: cities };

  const results = await prisma.tenderResult.findMany({
    where: {
      createdAt: { gte: startDate },
      winnerAmount: { not: 0 },
      tender: tenderWhere,
    },
    include: {
      tender: { select: { estimatedCost: true } },
    },
    take: 200,
  });

  if (results.length === 0) {
    return {
      avgDiscount: 0,
      minDiscount: 0,
      maxDiscount: 0,
      avgWinnerPrice: 0,
      priceRange: { min: 0, max: 0 },
    };
  }

  const discounts: number[] = [];
  const prices: number[] = [];

  for (const r of results) {
    const winnerPrice = Number(r.winnerAmount);
    const estimated = Number(r.tender.estimatedCost || 0);
    prices.push(winnerPrice);

    if (estimated > 0) {
      const discount = ((estimated - winnerPrice) / estimated) * 100;
      discounts.push(discount);
    }
  }

  return {
    avgDiscount: discounts.length > 0 ? Math.round(discounts.reduce((a, b) => a + b, 0) / discounts.length) : 0,
    minDiscount: discounts.length > 0 ? Math.round(Math.min(...discounts)) : 0,
    maxDiscount: discounts.length > 0 ? Math.round(Math.max(...discounts)) : 0,
    avgWinnerPrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
    priceRange: { min: Math.min(...prices), max: Math.max(...prices) },
  };
}

// ─── Competitor Analysis ────────────────────────────────────

async function analyzeCompetitors(
  startDate: Date,
  sectors?: string[],
  cities?: string[],
): Promise<CompetitorInsight[]> {
  const tenderWhere: Record<string, unknown> = {};
  if (sectors?.length) tenderWhere.tenderType = { in: sectors };
  if (cities?.length) tenderWhere.city = { in: cities };

  const results = await prisma.tenderResult.findMany({
    where: {
      createdAt: { gte: startDate },
      winnerName: { not: "" },
      tender: tenderWhere,
    },
    include: {
      tender: { select: { tenderType: true, city: true } },
    },
    take: 500,
  });

  const competitors: Record<string, CompetitorInsight> = {};

  for (const r of results) {
    const name = r.winnerName;
    if (!competitors[name]) {
      competitors[name] = {
        companyName: name,
        winCount: 0,
        totalBidAmount: 0,
        avgDiscount: 0,
        sectors: [],
        cities: [],
      };
    }
    const c = competitors[name];
    c.winCount++;
    c.totalBidAmount += Number(r.winnerAmount || 0);

    if (r.tender.tenderType && !c.sectors.includes(r.tender.tenderType)) {
      c.sectors.push(r.tender.tenderType);
    }
    if (r.tender.city && !c.cities.includes(r.tender.city)) {
      c.cities.push(r.tender.city);
    }
  }

  return Object.values(competitors)
    .sort((a, b) => b.winCount - a.winCount)
    .slice(0, 15);
}

// ─── AI Summary ─────────────────────────────────────────────

async function generateAISummary(
  sectors: SectorTrend[],
  prices: PriceAnalysis,
  competitors: CompetitorInsight[],
): Promise<{ text: string; recommendations: string[] }> {
  const prompt = `
Aşağıdaki pazar verilerini analiz et ve Türkçe özet rapor hazırla:

SEKTÖR TRENDLERİ:
${sectors.map((s) => `- ${s.sector}: ${s.tenderCount} ihale, ₺${s.totalBudget.toLocaleString("tr-TR")} toplam bütçe, trend: ${s.trend} (%${s.changePercent})`).join("\n")}

FİYAT ANALİZİ:
- Ortalama İndirim: %${prices.avgDiscount}
- İndirim Aralığı: %${prices.minDiscount} - %${prices.maxDiscount}
- Ortalama Kazanan Fiyat: ₺${prices.avgWinnerPrice.toLocaleString("tr-TR")}

RAKİP ANALİZİ (İlk 5):
${competitors.slice(0, 5).map((c) => `- ${c.companyName}: ${c.winCount} kazanım, sektörler: ${c.sectors.join(", ")}`).join("\n")}

JSON yanıt ver:
{
  "text": "3-5 paragraf pazar özeti",
  "recommendations": ["Öneri 1", "Öneri 2", ...]
}

KURALLAR:
- Stratejik ve uygulanabilir öneriler sun
- Fırsatları ve riskleri belirt
- Sadece JSON formatında yanıt ver
`;

  const result = await complete({
    prompt,
    maxTokens: 1500,
    temperature: 0.3,
    cacheKey: `market-summary:${Date.now().toString().substring(0, 8)}`,
    cacheTtl: 3600,
  });

  try {
    const jsonMatch = result.text.match(/```(?:json)?\s*([\s\S]*?)```/) || result.text.match(/(\{[\s\S]*\})/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim());
    }
  } catch {
    // Fallback
  }

  return {
    text: result.text,
    recommendations: ["Detaylı analiz için AI özetini inceleyin."],
  };
}

// ─── Helpers ────────────────────────────────────────────────

function buildOverview(sectors: SectorTrend[], prices: PriceAnalysis): string {
  const totalTenders = sectors.reduce((a, b) => a + b.tenderCount, 0);
  const totalBudget = sectors.reduce((a, b) => a + b.totalBudget, 0);
  const risingCount = sectors.filter((s) => s.trend === "YUKSELIS").length;

  return `Dönemde toplam ${totalTenders} ihale, ₺${totalBudget.toLocaleString("tr-TR")} bütçe tespit edildi. ` +
    `${risingCount} sektörde yükseliş trendi görülüyor. ` +
    `Ortalama kazanım indirimi %${prices.avgDiscount}.`;
}
