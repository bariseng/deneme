import { prisma } from "@/lib/prisma";
import { RiskLevel } from "@/generated/prisma/client";

// ─── TYPES ──────────────────────────────────────────────────

export interface Subscores {
  tenderHistory: number;   // 0-100, weight 25%
  paymentHistory: number;  // 0-100, weight 20%
  debtRatio: number;       // 0-100, weight 20%
  capacityScore: number;   // 0-100, weight 20%
  sectorExperience: number;// 0-100, weight 15%
}

interface CompanyData {
  companyId?: string;
  competitorId?: string;
  name: string;
  taxNumber?: string;
  totalWins: number;
  totalBids: number;
  onTimeDeliveryRate: number;    // 0-1
  hasTaxDebt: boolean;
  hasSgkDebt: boolean;
  activeTenderCount: number;
  maxCapacity: number;           // max concurrent tenders
  sectorCount: number;           // different sectors worked in
  totalExperienceYears: number;
}

// ─── RISK LEVEL ─────────────────────────────────────────────

export function getRiskLevel(score: number): RiskLevel {
  if (score >= 80) return "LOW";
  if (score >= 60) return "MEDIUM";
  if (score >= 40) return "HIGH";
  return "CRITICAL";
}

export function getRiskColor(level: string) {
  switch (level) {
    case "LOW": return { bg: "bg-green-100", text: "text-green-700", border: "border-green-300", label: "Düşük Risk" };
    case "MEDIUM": return { bg: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-300", label: "Orta Risk" };
    case "HIGH": return { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-300", label: "Yüksek Risk" };
    case "CRITICAL": return { bg: "bg-red-100", text: "text-red-700", border: "border-red-300", label: "Kritik Risk" };
    default: return { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-300", label: "Bilinmiyor" };
  }
}

// ─── SCORE CALCULATION ──────────────────────────────────────

export function calculateHealthScore(data: CompanyData): { overall: number; subscores: Subscores } {
  // 1. İhale kazanma geçmişi (%25)
  let tenderHistory = 50; // default
  if (data.totalBids > 0) {
    const winRate = data.totalWins / data.totalBids;
    tenderHistory = Math.min(100, Math.round(winRate * 200)); // 50% win rate = 100
  }
  if (data.totalBids >= 10) tenderHistory = Math.min(100, tenderHistory + 10);
  if (data.totalBids >= 25) tenderHistory = Math.min(100, tenderHistory + 5);

  // 2. Ödeme geçmişi (%20)
  const paymentHistory = Math.round(data.onTimeDeliveryRate * 100);

  // 3. Borç durumu (%20)
  let debtRatio = 100;
  if (data.hasTaxDebt) debtRatio -= 40;
  if (data.hasSgkDebt) debtRatio -= 40;

  // 4. Kapasite (%20)
  let capacityScore = 100;
  if (data.maxCapacity > 0) {
    const utilization = data.activeTenderCount / data.maxCapacity;
    if (utilization > 0.9) capacityScore = 30;
    else if (utilization > 0.7) capacityScore = 60;
    else if (utilization > 0.5) capacityScore = 80;
  }

  // 5. Sektör deneyimi (%15)
  let sectorExperience = Math.min(100, data.sectorCount * 25);
  if (data.totalExperienceYears >= 10) sectorExperience = Math.min(100, sectorExperience + 20);
  else if (data.totalExperienceYears >= 5) sectorExperience = Math.min(100, sectorExperience + 10);

  const overall = Math.round(
    tenderHistory * 0.25 +
    paymentHistory * 0.20 +
    debtRatio * 0.20 +
    capacityScore * 0.20 +
    sectorExperience * 0.15
  );

  return {
    overall,
    subscores: { tenderHistory, paymentHistory, debtRatio, capacityScore, sectorExperience },
  };
}

// ─── RECOMMENDATIONS ────────────────────────────────────────

export function getRecommendations(subscores: Subscores): string[] {
  const recs: string[] = [];

  if (subscores.tenderHistory < 60) {
    recs.push("İhale kazanma oranınızı artırmak için daha uygun ihalelere başvurun.");
  }
  if (subscores.paymentHistory < 70) {
    recs.push("Zamanında teslim oranınızı iyileştirmek için proje yönetim süreçlerinizi gözden geçirin.");
  }
  if (subscores.debtRatio < 60) {
    recs.push("SGK ve/veya vergi borçlarınızı temizlemek skor artışı sağlayacaktır.");
  }
  if (subscores.capacityScore < 60) {
    recs.push("Kapasite kullanımınız yüksek. Yeni ihalelere girmeden mevcut işleri tamamlayın.");
  }
  if (subscores.sectorExperience < 50) {
    recs.push("Farklı sektörlerde deneyim kazanarak deneyim puanınızı artırabilirsiniz.");
  }

  if (recs.length === 0) {
    recs.push("Mali sağlık durumunuz iyi seviyede. Mevcut performansınızı koruyun.");
  }

  return recs;
}

// ─── MY SCORE ───────────────────────────────────────────────

export async function getOrCalculateMyScore(companyId: string) {
  // Check for valid existing score
  const existing = await prisma.financialHealthScore.findFirst({
    where: {
      companyId,
      validUntil: { gt: new Date() },
    },
    orderBy: { calculatedAt: "desc" },
  });

  if (existing) return existing;

  // Calculate new score from platform data
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { bids: true },
  });

  if (!company) throw new Error("Firma bulunamadı");

  // Gather data from platform
  const totalBids = company.bids.length;
  const totalWins = company.bids.filter((b) => b.status === "GONDERILDI").length;

  // Simulated data (would come from real integrations)
  const onTimeRate = totalBids > 0 ? 0.7 + Math.random() * 0.3 : 0.5;
  const activeTenders = company.bids.filter((b) => b.status === "TASLAK").length;
  const foundedYear = company.foundedYear || 2020;
  const experienceYears = new Date().getFullYear() - foundedYear;
  const sectors = company.sector ? company.sector.split(",").length : 1;

  const companyData: CompanyData = {
    companyId,
    name: company.name,
    taxNumber: company.taxNumber,
    totalWins,
    totalBids,
    onTimeDeliveryRate: onTimeRate,
    hasTaxDebt: Math.random() > 0.7,
    hasSgkDebt: Math.random() > 0.8,
    activeTenderCount: activeTenders,
    maxCapacity: Math.max(5, Math.floor((company.employeeCount || 10) / 5)),
    sectorCount: sectors,
    totalExperienceYears: experienceYears,
  };

  const { overall, subscores } = calculateHealthScore(companyData);

  // Sector benchmark
  const benchmarkScores = await prisma.financialHealthScore.findMany({
    where: { companyId: { not: null } },
    select: { overallScore: true },
    take: 50,
  });
  const sectorBenchmark = benchmarkScores.length > 0
    ? Math.round(benchmarkScores.reduce((s, r) => s + r.overallScore, 0) / benchmarkScores.length)
    : 65;

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 30);

  const score = await prisma.financialHealthScore.create({
    data: {
      companyId,
      targetName: company.name,
      targetTaxNumber: company.taxNumber,
      overallScore: overall,
      subscores: JSON.parse(JSON.stringify(subscores)),
      riskLevel: getRiskLevel(overall),
      sectorBenchmark,
      calculatedAt: new Date(),
      validUntil,
    },
  });

  return score;
}

// ─── QUERY COMPETITOR ───────────────────────────────────────

export async function queryCompetitorScore(
  userId: string,
  targetName: string,
  targetTaxNumber?: string
) {
  // Find competitor in database
  const competitor = await prisma.competitorProfile.findFirst({
    where: targetTaxNumber
      ? { taxNumber: targetTaxNumber }
      : { name: { contains: targetName, mode: "insensitive" as const } },
    include: { experiences: true },
  });

  // Check for existing valid score
  if (competitor) {
    const existing = await prisma.financialHealthScore.findFirst({
      where: {
        competitorId: competitor.id,
        validUntil: { gt: new Date() },
      },
      orderBy: { calculatedAt: "desc" },
    });

    if (existing) {
      await prisma.financialHealthQuery.create({
        data: {
          userId,
          targetCompanyName: targetName,
          targetTaxNumber: targetTaxNumber || null,
          resultScoreId: existing.id,
        },
      });
      return existing;
    }
  }

  // Calculate from available data
  const totalBids = competitor?.totalBids || Math.floor(Math.random() * 30) + 5;
  const totalWins = competitor?.totalWins || Math.floor(totalBids * (0.2 + Math.random() * 0.4));
  const sectorCount = competitor?.experiences
    ? new Set(competitor.experiences.map((e) => e.institution).filter(Boolean)).size || 1
    : Math.floor(Math.random() * 3) + 1;

  const companyData: CompanyData = {
    competitorId: competitor?.id,
    name: targetName,
    taxNumber: targetTaxNumber,
    totalWins,
    totalBids,
    onTimeDeliveryRate: 0.5 + Math.random() * 0.5,
    hasTaxDebt: Math.random() > 0.6,
    hasSgkDebt: Math.random() > 0.7,
    activeTenderCount: Math.floor(Math.random() * 5),
    maxCapacity: 5 + Math.floor(Math.random() * 10),
    sectorCount,
    totalExperienceYears: Math.floor(Math.random() * 15) + 2,
  };

  const { overall, subscores } = calculateHealthScore(companyData);

  const benchmarkScores = await prisma.financialHealthScore.findMany({
    select: { overallScore: true },
    take: 50,
  });
  const sectorBenchmark = benchmarkScores.length > 0
    ? Math.round(benchmarkScores.reduce((s, r) => s + r.overallScore, 0) / benchmarkScores.length)
    : 65;

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 30);

  const score = await prisma.financialHealthScore.create({
    data: {
      competitorId: competitor?.id || null,
      targetName,
      targetTaxNumber: targetTaxNumber || null,
      overallScore: overall,
      subscores: JSON.parse(JSON.stringify(subscores)),
      riskLevel: getRiskLevel(overall),
      sectorBenchmark,
      calculatedAt: new Date(),
      validUntil,
    },
  });

  // Log query
  await prisma.financialHealthQuery.create({
    data: {
      userId,
      targetCompanyName: targetName,
      targetTaxNumber: targetTaxNumber || null,
      resultScoreId: score.id,
    },
  });

  return score;
}

// ─── CAPACITY ANALYSIS ──────────────────────────────────────

export async function getCapacityAnalysis(companyId: string) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { bids: true },
  });

  if (!company) throw new Error("Firma bulunamadı");

  const activeTenders = company.bids.filter((b) => b.status === "TASLAK" || b.status === "GONDERILDI").length;
  const totalCommitment = company.bids
    .filter((b) => b.status === "GONDERILDI")
    .reduce((sum, b) => sum + Number(b.totalAmount || 0), 0);

  const employeeCount = company.employeeCount || 10;
  const estimatedCapacity = employeeCount * 500000; // simplified capacity estimate
  const utilizationPercent = estimatedCapacity > 0
    ? Math.min(100, (totalCommitment / estimatedCapacity) * 100)
    : 0;

  const analysis = await prisma.capacityAnalysis.create({
    data: {
      companyId,
      activeTenders,
      totalCommitment,
      estimatedCapacity,
      utilizationPercent,
    },
  });

  return analysis;
}

// ─── GET SCORE BY ID ────────────────────────────────────────

export async function getScoreById(id: string) {
  return prisma.financialHealthScore.findUnique({ where: { id } });
}

// ─── QUERY HISTORY ──────────────────────────────────────────

export async function getQueryHistory(userId: string) {
  return prisma.financialHealthQuery.findMany({
    where: { userId },
    include: { resultScore: true },
    orderBy: { queriedAt: "desc" },
    take: 20,
  });
}

// ─── FORMAT ─────────────────────────────────────────────────

export function formatTRY(val: number) {
  return val.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export const SUBSCORE_LABELS: Record<string, { label: string; weight: string }> = {
  tenderHistory: { label: "İhale Kazanma Geçmişi", weight: "%25" },
  paymentHistory: { label: "Ödeme & Teslim Geçmişi", weight: "%20" },
  debtRatio: { label: "Borç Durumu (SGK/Vergi)", weight: "%20" },
  capacityScore: { label: "Kapasite Kullanımı", weight: "%20" },
  sectorExperience: { label: "Sektör Deneyimi", weight: "%15" },
};
