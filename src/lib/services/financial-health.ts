// ─── Firma Mali Sağlık Skoru (Multi-Source) ─────────────────

import { prisma } from "@/lib/prisma";
import { kapProvider } from "@/lib/providers/kap-provider";

// ─── Types ──────────────────────────────────────────────────

export interface ScoreBreakdown {
  tenderHistory: { score: number; weight: number; available: boolean };
  companyAge: { score: number; weight: number; available: boolean };
  capitalStrength: { score: number; weight: number; available: boolean };
  financialRatios: { score: number; weight: number; available: boolean };
  parasutHealth: { score: number; weight: number; available: boolean };
  contractPerformance: { score: number; weight: number; available: boolean };
}

export interface HealthScoreResult {
  overallScore: number;
  breakdown: ScoreBreakdown;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  confidence: number; // 0-100 based on data source count
  sourceCount: number;
  maxSources: number;
  calculatedAt: Date;
}

type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

// ─── Score Calculation ──────────────────────────────────────

export async function calculateMultiSourceScore(
  companyId: string,
): Promise<HealthScoreResult> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      bids: { select: { status: true, totalAmount: true } },
      capacityAnalyses: { orderBy: { analyzedAt: "desc" }, take: 1 },
      parasutConnection: { select: { isActive: true, companyId: true } },
    },
  });

  if (!company) throw new Error("Firma bulunamadı");

  const breakdown: ScoreBreakdown = {
    tenderHistory: { score: 0, weight: 25, available: false },
    companyAge: { score: 0, weight: 15, available: false },
    capitalStrength: { score: 0, weight: 15, available: false },
    financialRatios: { score: 0, weight: 20, available: false },
    parasutHealth: { score: 0, weight: 15, available: false },
    contractPerformance: { score: 0, weight: 10, available: false },
  };

  // 1. İhale geçmişi (EKAP verilerinden)
  if (company.bids.length > 0) {
    const wins = company.bids.filter((b) => b.status === "GONDERILDI").length;
    const total = company.bids.length;
    const winRate = total > 0 ? wins / total : 0;
    breakdown.tenderHistory.score = Math.min(100, winRate * 100 + Math.min(total, 20) * 2);
    breakdown.tenderHistory.available = true;
  }

  // 2. Şirket yaşı (MERSİS'ten)
  if (company.foundedYear) {
    const age = new Date().getFullYear() - company.foundedYear;
    breakdown.companyAge.score = Math.min(100, age * 5);
    breakdown.companyAge.available = true;
  }

  // 3. Sermaye gücü (MERSİS'ten)
  if (company.capitalAmount) {
    const capital = Number(company.capitalAmount);
    if (capital >= 10_000_000) breakdown.capitalStrength.score = 100;
    else if (capital >= 5_000_000) breakdown.capitalStrength.score = 85;
    else if (capital >= 1_000_000) breakdown.capitalStrength.score = 70;
    else if (capital >= 500_000) breakdown.capitalStrength.score = 55;
    else if (capital >= 100_000) breakdown.capitalStrength.score = 40;
    else breakdown.capitalStrength.score = 20;
    breakdown.capitalStrength.available = true;
  }

  // 4. KAP finansal rasyoları (halka açıksa)
  if (company.externalKapId) {
    try {
      const kap = kapProvider as unknown as { getFinancials(id: string): Promise<{ currentRatio: number; debtToEquity: number; netProfitMargin: number; returnOnEquity: number }[]>; calculateRatios(f: unknown): { currentRatio: number; debtToEquity: number; netProfitMargin: number; returnOnEquity: number } };
      const financials = await kap.getFinancials(company.externalKapId);
      if (financials.length > 0) {
        const latest = financials[0];
        const ratios = kap.calculateRatios(latest);
        let ratioScore = 0;
        if (ratios.currentRatio >= 1.5) ratioScore += 30;
        else if (ratios.currentRatio >= 1.0) ratioScore += 20;
        if (ratios.debtToEquity <= 1.0) ratioScore += 25;
        else if (ratios.debtToEquity <= 2.0) ratioScore += 15;
        if (ratios.netProfitMargin > 10) ratioScore += 25;
        else if (ratios.netProfitMargin > 5) ratioScore += 15;
        if (ratios.returnOnEquity > 15) ratioScore += 20;
        else if (ratios.returnOnEquity > 8) ratioScore += 10;
        breakdown.financialRatios.score = Math.min(100, ratioScore);
        breakdown.financialRatios.available = true;
      }
    } catch {
      // KAP data unavailable, skip
    }
  }

  // 5. Paraşüt verileri (bağlıysa)
  if (company.parasutConnection?.isActive) {
    try {
      const { parasutProvider } = await import("@/lib/providers/parasut-provider");
      const summary = await parasutProvider.getInvoiceSummary(company.id);
      let parasutScore = 50; // base
      if (summary.totalRevenue > 0) {
        const receivableRatio = summary.outstandingReceivables / summary.totalRevenue;
        if (receivableRatio < 0.1) parasutScore += 25;
        else if (receivableRatio < 0.3) parasutScore += 15;
        const payableRatio = summary.outstandingPayables / summary.totalRevenue;
        if (payableRatio < 0.15) parasutScore += 25;
        else if (payableRatio < 0.3) parasutScore += 10;
      }
      breakdown.parasutHealth.score = Math.min(100, parasutScore);
      breakdown.parasutHealth.available = true;
    } catch {
      // Parasut data unavailable
    }
  }

  // 6. Sözleşme performansı (kullanıcı bazlı — firmanın kullanıcıları üzerinden)
  const userIds = await prisma.user.findMany({
    where: { companyId },
    select: { id: true },
  });
  const contracts = await prisma.contract.findMany({
    where: { userId: { in: userIds.map((u) => u.id) } },
    select: { status: true, totalAmount: true },
  });
  if (contracts.length > 0) {
    const completed = contracts.filter((c) => c.status === "TAMAMLANDI").length;
    const total = contracts.length;
    breakdown.contractPerformance.score = Math.min(100, (completed / total) * 80 + Math.min(total, 10) * 2);
    breakdown.contractPerformance.available = true;
  }

  // ── Weighted score with normalization for missing sources ──
  const available = Object.values(breakdown).filter((b) => b.available);
  const sourceCount = available.length;
  const maxSources = Object.keys(breakdown).length;

  let overallScore: number;
  if (sourceCount === 0) {
    overallScore = 50; // default neutral
  } else {
    const totalWeight = available.reduce((sum, b) => sum + b.weight, 0);
    overallScore = Math.round(
      available.reduce((sum, b) => sum + (b.score * b.weight) / totalWeight, 0),
    );
  }

  const confidence = Math.round((sourceCount / maxSources) * 100);
  const riskLevel = getRiskLevel(overallScore);

  return {
    overallScore,
    breakdown,
    riskLevel,
    confidence,
    sourceCount,
    maxSources,
    calculatedAt: new Date(),
  };
}

function getRiskLevel(score: number): RiskLevel {
  if (score >= 80) return "LOW";
  if (score >= 60) return "MEDIUM";
  if (score >= 40) return "HIGH";
  return "CRITICAL";
}

// ─── Persist Score ──────────────────────────────────────────

export async function calculateAndSaveScore(companyId: string) {
  const result = await calculateMultiSourceScore(companyId);

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { name: true, taxNumber: true },
  });

  if (!company) throw new Error("Firma bulunamadı");

  const score = await prisma.financialHealthScore.create({
    data: {
      companyId,
      targetName: company.name,
      targetTaxNumber: company.taxNumber,
      overallScore: result.overallScore,
      subscores: JSON.parse(JSON.stringify(result.breakdown)),
      riskLevel: result.riskLevel,
      calculatedAt: result.calculatedAt,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  return { scoreId: score.id, ...result };
}
