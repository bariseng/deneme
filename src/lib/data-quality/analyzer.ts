// ─── Data Quality Analyzer ──────────────────────────────────
// Mock vs Real data comparison, field coverage, validation metrics

import { validateTender, validateTenderBatch, detectDuplicates } from "../validators/tender-validator";
import { validateCompany } from "../validators/company-validator";
import { validatePriceIndex, validatePriceBatch } from "../validators/price-validator";
import { getAllFlags, type FeatureFlag } from "../feature-flags";

// ─── Types ──────────────────────────────────────────────────

export interface DataQualityReport {
  timestamp: string;
  summary: {
    totalRecords: number;
    mockRecords: number;
    realRecords: number;
    mockRatio: number; // 0-100
    realRatio: number; // 0-100
    overallScore: number; // 0-100
  };
  tenders: TenderQualityReport;
  companies: CompanyQualityReport;
  priceIndices: PriceIndexQualityReport;
  featureFlags: FlagStatus[];
  recommendations: string[];
}

export interface TenderQualityReport {
  total: number;
  mock: number;
  real: number;
  validation: {
    validCount: number;
    invalidCount: number;
    warningCount: number;
    commonErrors: Array<{ error: string; count: number }>;
  };
  fieldCoverage: FieldCoverageMap;
  duplicates: number;
  mockPatterns: MockPatternAnalysis;
}

export interface CompanyQualityReport {
  total: number;
  mock: number;
  real: number;
  validation: {
    validCount: number;
    invalidCount: number;
    commonErrors: Array<{ error: string; count: number }>;
  };
  fieldCoverage: FieldCoverageMap;
}

export interface PriceIndexQualityReport {
  total: number;
  mock: number;
  real: number;
  validation: {
    validCount: number;
    invalidCount: number;
    warningCount: number;
  };
  fieldCoverage: FieldCoverageMap;
}

export interface FieldCoverageMap {
  [field: string]: {
    total: number;
    filled: number;
    coverage: number; // 0-100
  };
}

export interface MockPatternAnalysis {
  ekapNoPattern: string;
  cityDistribution: Array<{ city: string; count: number; percentage: number }>;
  budgetRange: { min: number; max: number; avg: number; median: number };
  typeDistribution: Array<{ type: string; count: number; percentage: number }>;
  statusDistribution: Array<{ status: string; count: number; percentage: number }>;
  isUniformDistribution: boolean;
}

export interface FlagStatus {
  name: FeatureFlag;
  enabled: boolean;
  rollout: number;
  description: string;
}

// ─── Field Coverage Calculator ──────────────────────────────

export function calculateFieldCoverage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  records: Record<string, any>[],
  fields: string[],
): FieldCoverageMap {
  const coverage: FieldCoverageMap = {};

  for (const field of fields) {
    const filled = records.filter((r) => {
      const val = r[field];
      return val !== null && val !== undefined && val !== "" && val !== 0;
    }).length;

    coverage[field] = {
      total: records.length,
      filled,
      coverage: records.length > 0 ? Math.round((filled / records.length) * 100) : 0,
    };
  }

  return coverage;
}

// ─── Mock Pattern Detection ─────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function analyzeMockPatterns(tenders: Record<string, any>[]): MockPatternAnalysis {
  // EKAP No pattern
  const ekapNos = tenders.map((t) => t.ekapNo).filter(Boolean) as string[];
  const ekapPattern = detectEkapPattern(ekapNos);

  // City distribution
  const cityMap = new Map<string, number>();
  for (const t of tenders) {
    if (t.city) cityMap.set(t.city, (cityMap.get(t.city) || 0) + 1);
  }
  const cityDistribution = Array.from(cityMap.entries())
    .map(([city, count]) => ({
      city,
      count,
      percentage: Math.round((count / tenders.length) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  // Budget range
  const budgets = tenders
    .map((t) => Number(t.estimatedCost))
    .filter((b) => !isNaN(b) && b > 0)
    .sort((a, b) => a - b);

  const budgetRange = {
    min: budgets[0] || 0,
    max: budgets[budgets.length - 1] || 0,
    avg: budgets.length > 0 ? Math.round(budgets.reduce((a, b) => a + b, 0) / budgets.length) : 0,
    median: budgets.length > 0 ? budgets[Math.floor(budgets.length / 2)] : 0,
  };

  // Type distribution
  const typeMap = new Map<string, number>();
  for (const t of tenders) {
    if (t.tenderType) typeMap.set(t.tenderType, (typeMap.get(t.tenderType) || 0) + 1);
  }
  const typeDistribution = Array.from(typeMap.entries())
    .map(([type, count]) => ({
      type,
      count,
      percentage: Math.round((count / tenders.length) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  // Status distribution
  const statusMap = new Map<string, number>();
  for (const t of tenders) {
    if (t.status) statusMap.set(t.status, (statusMap.get(t.status) || 0) + 1);
  }
  const statusDistribution = Array.from(statusMap.entries())
    .map(([status, count]) => ({
      status,
      count,
      percentage: Math.round((count / tenders.length) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  // Check if distribution is too uniform (sign of mock data)
  const isUniformDistribution = checkUniformDistribution(cityDistribution.map((c) => c.count));

  return {
    ekapNoPattern: ekapPattern,
    cityDistribution,
    budgetRange,
    typeDistribution,
    statusDistribution,
    isUniformDistribution,
  };
}

function detectEkapPattern(ekapNos: string[]): string {
  if (ekapNos.length === 0) return "N/A";

  // Check for sequential pattern like 2026/100000, 2026/100001, ...
  const sequential = ekapNos.every((no) => /^\d{4}\/\d+$/.test(no));
  if (sequential) {
    const parts = ekapNos.map((no) => {
      const [year, num] = no.split("/");
      return { year, num: parseInt(num, 10) };
    });
    const years = new Set(parts.map((p) => p.year));
    const nums = parts.map((p) => p.num).sort((a, b) => a - b);
    const isSequential = nums.every((n, i) => i === 0 || n === nums[i - 1] + 1);

    if (years.size === 1 && isSequential) {
      return `Ardışık seri: ${parts[0].year}/${nums[0]}-${nums[nums.length - 1]} (MOCK kalıbı)`;
    }
    if (years.size === 1) {
      return `Aynı yıl (${parts[0].year}), rastgele numaralar`;
    }
  }

  // Check for pure numeric pattern
  const allNumeric = ekapNos.every((no) => /^\d+$/.test(no));
  if (allNumeric) return "Sadece rakam (gerçek EKAP formatı)";

  return "Karışık format";
}

function checkUniformDistribution(counts: number[]): boolean {
  if (counts.length < 3) return false;
  const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
  const maxDeviation = Math.max(...counts.map((c) => Math.abs(c - avg)));
  // If max deviation from average is less than 30% of average, it's too uniform
  return maxDeviation / avg < 0.3;
}

// ─── Tender Quality Analysis ────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function analyzeTenderQuality(tenders: Record<string, any>[]): TenderQualityReport {
  const mock = tenders.filter((t) => t.source === "MOCK" || !t.source || t.ekapNo?.includes("/10"));
  const real = tenders.filter((t) => t.source && t.source !== "MOCK" && !t.ekapNo?.includes("/10"));

  // Validation
  const batchResult = validateTenderBatch(tenders);
  const errorCounts = new Map<string, number>();
  for (const { result } of batchResult.results) {
    for (const err of result.errors) {
      errorCounts.set(err, (errorCounts.get(err) || 0) + 1);
    }
    for (const warn of result.warnings) {
      errorCounts.set(warn, (errorCounts.get(warn) || 0) + 1);
    }
  }
  const commonErrors = Array.from(errorCounts.entries())
    .map(([error, count]) => ({ error, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Field coverage
  const tenderFields = [
    "title", "institution", "city", "tenderType", "status", "ekapNo",
    "ilanNo", "description", "requirements", "estimatedCost", "guaranteeRate",
    "publishDate", "deadline", "openingDate", "latitude", "longitude",
    "contactPerson", "contactPhone", "contactEmail", "viewCount", "source",
  ];
  const fieldCoverage = calculateFieldCoverage(tenders, tenderFields);

  // Duplicates
  const duplicates = detectDuplicates(tenders);

  // Mock patterns
  const mockPatterns = analyzeMockPatterns(mock.length > 0 ? mock : tenders);

  return {
    total: tenders.length,
    mock: mock.length,
    real: real.length,
    validation: {
      validCount: batchResult.validCount,
      invalidCount: batchResult.invalidCount,
      warningCount: batchResult.warningCount,
      commonErrors,
    },
    fieldCoverage,
    duplicates: duplicates.length,
    mockPatterns,
  };
}

// ─── Company Quality Analysis ───────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function analyzeCompanyQuality(companies: Record<string, any>[]): CompanyQualityReport {
  // Heuristic: mock companies have simple tax numbers like 1234567890
  const mock = companies.filter((c) => {
    const taxNo = c.taxNumber || "";
    return /^(\d)\1*$/.test(taxNo) || /^1234|^9876/.test(taxNo);
  });
  const real = companies.filter((c) => !mock.includes(c));

  const errorCounts = new Map<string, number>();
  let validCount = 0;
  let invalidCount = 0;

  for (const company of companies) {
    const result = validateCompany(company);
    if (result.valid) validCount++;
    else invalidCount++;
    for (const err of [...result.errors, ...result.warnings]) {
      errorCounts.set(err, (errorCounts.get(err) || 0) + 1);
    }
  }

  const commonErrors = Array.from(errorCounts.entries())
    .map(([error, count]) => ({ error, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const companyFields = [
    "name", "taxNumber", "taxOffice", "address", "city", "phone",
    "email", "website", "sector", "description", "foundedYear", "employeeCount",
  ];
  const fieldCoverage = calculateFieldCoverage(companies, companyFields);

  return {
    total: companies.length,
    mock: mock.length,
    real: real.length,
    validation: { validCount, invalidCount, commonErrors },
    fieldCoverage,
  };
}

// ─── Price Index Quality Analysis ───────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function analyzePriceQuality(prices: Record<string, any>[]): PriceIndexQualityReport {
  const mock = prices.filter((p) => p.source === "MOCK" || !p.source);
  const real = prices.filter((p) => p.source && p.source !== "MOCK");

  const batchResult = validatePriceBatch(
    prices.map((p) => ({
      sector: p.sector,
      item: p.item || p.name,
      unit: p.unit,
      price: Number(p.price || p.value || 0),
      prevPrice: p.prevPrice ? Number(p.prevPrice) : null,
      change: p.change ? Number(p.change) : null,
      month: p.month || p.period,
    })),
  );

  const priceFields = [
    "sector", "item", "unit", "price", "prevPrice", "change", "month", "source",
  ];
  const fieldCoverage = calculateFieldCoverage(prices, priceFields);

  return {
    total: prices.length,
    mock: mock.length,
    real: real.length,
    validation: {
      validCount: batchResult.validCount,
      invalidCount: batchResult.invalidCount,
      warningCount: batchResult.warnings.length,
    },
    fieldCoverage,
  };
}

// ─── Overall Quality Score ──────────────────────────────────

export function calculateQualityScore(report: DataQualityReport): number {
  let score = 0;
  const weights = { validation: 40, coverage: 30, diversity: 20, duplicates: 10 };

  // Validation score (40%)
  const totalRecords = report.tenders.total + report.companies.total + report.priceIndices.total;
  const validRecords =
    report.tenders.validation.validCount +
    report.companies.validation.validCount +
    report.priceIndices.validation.validCount;
  if (totalRecords > 0) {
    score += (validRecords / totalRecords) * weights.validation;
  }

  // Field coverage score (30%)
  const allCoverages = [
    ...Object.values(report.tenders.fieldCoverage),
    ...Object.values(report.companies.fieldCoverage),
    ...Object.values(report.priceIndices.fieldCoverage),
  ];
  if (allCoverages.length > 0) {
    const avgCoverage = allCoverages.reduce((a, b) => a + b.coverage, 0) / allCoverages.length;
    score += (avgCoverage / 100) * weights.coverage;
  }

  // Diversity score (20%) — penalize too-uniform mock distributions
  if (!report.tenders.mockPatterns.isUniformDistribution) {
    score += weights.diversity;
  } else {
    score += weights.diversity * 0.5; // Half credit for uniform
  }

  // Duplicate penalty (10%)
  if (report.tenders.duplicates === 0) {
    score += weights.duplicates;
  } else {
    const dupRatio = report.tenders.duplicates / Math.max(report.tenders.total, 1);
    score += weights.duplicates * Math.max(0, 1 - dupRatio);
  }

  return Math.round(score);
}

// ─── Generate Recommendations ───────────────────────────────

export function generateRecommendations(report: DataQualityReport): string[] {
  const recs: string[] = [];

  // Mock ratio check
  if (report.summary.mockRatio > 80) {
    recs.push(
      `Verilerin %${report.summary.mockRatio}'i mock veri. Gerçek veri entegrasyonlarını aktifleştirin (USE_REAL_EKAP_DATA=true).`,
    );
  }

  // Validation issues
  if (report.tenders.validation.invalidCount > 0) {
    recs.push(
      `${report.tenders.validation.invalidCount} ihale doğrulama hatası içeriyor. En yaygın: ${report.tenders.validation.commonErrors[0]?.error || "N/A"}`,
    );
  }

  // Low field coverage
  const lowCoverageFields = Object.entries(report.tenders.fieldCoverage)
    .filter(([, v]) => v.coverage < 50)
    .map(([k]) => k);
  if (lowCoverageFields.length > 0) {
    recs.push(
      `Düşük alan kapsama oranı: ${lowCoverageFields.join(", ")}. Bu alanlar gerçek veriye geçişte doldurulmalı.`,
    );
  }

  // Duplicates
  if (report.tenders.duplicates > 0) {
    recs.push(
      `${report.tenders.duplicates} mükerrer ihale kaydı tespit edildi. Migrasyon öncesi temizlenmelidir.`,
    );
  }

  // Uniform distribution warning
  if (report.tenders.mockPatterns.isUniformDistribution) {
    recs.push(
      "Şehir dağılımı çok düzgün (uniform) — mock veri kalıbı. Gerçek veriler doğal dağılım gösterecektir.",
    );
  }

  // EKAP pattern
  if (report.tenders.mockPatterns.ekapNoPattern.includes("MOCK")) {
    recs.push(
      "EKAP numaraları ardışık seri halinde — gerçek EKAP entegrasyonu farklı format kullanır.",
    );
  }

  // Feature flags
  const disabledFlags = report.featureFlags.filter((f) => !f.enabled);
  if (disabledFlags.length > 0) {
    recs.push(
      `${disabledFlags.length} feature flag kapalı: ${disabledFlags.map((f) => f.name).join(", ")}. Kademeli açılış planını uygulayın.`,
    );
  }

  // Company data
  if (report.companies.total < 5) {
    recs.push(
      `Sadece ${report.companies.total} firma kaydı mevcut. MERSİS/KAP entegrasyonu ile zenginleştirilmeli.`,
    );
  }

  // Price indices
  if (report.priceIndices.total === 0) {
    recs.push("Fiyat endeksi verisi bulunmuyor. TÜİK/CSB entegrasyonunu aktifleştirin.");
  }

  return recs;
}

// ─── Full Report Generator ──────────────────────────────────

export function generateDataQualityReport(data: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tenders: Record<string, any>[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  companies: Record<string, any>[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  priceIndices: Record<string, any>[];
}): DataQualityReport {
  const tenders = analyzeTenderQuality(data.tenders);
  const companies = analyzeCompanyQuality(data.companies);
  const priceIndices = analyzePriceQuality(data.priceIndices);
  const featureFlags = getAllFlags();

  const totalRecords = tenders.total + companies.total + priceIndices.total;
  const mockRecords = tenders.mock + companies.mock + priceIndices.mock;
  const realRecords = tenders.real + companies.real + priceIndices.real;

  const report: DataQualityReport = {
    timestamp: new Date().toISOString(),
    summary: {
      totalRecords,
      mockRecords,
      realRecords,
      mockRatio: totalRecords > 0 ? Math.round((mockRecords / totalRecords) * 100) : 0,
      realRatio: totalRecords > 0 ? Math.round((realRecords / totalRecords) * 100) : 0,
      overallScore: 0,
    },
    tenders,
    companies,
    priceIndices,
    featureFlags,
    recommendations: [],
  };

  report.summary.overallScore = calculateQualityScore(report);
  report.recommendations = generateRecommendations(report);

  return report;
}

// ─── Console Report Printer ─────────────────────────────────

export function printDataQualityReport(report: DataQualityReport): void {
  console.log("\n" + "═".repeat(60));
  console.log("  DATA KALİTESİ RAPORU");
  console.log("═".repeat(60));

  // Summary
  console.log(`\n  Genel Skor: ${report.summary.overallScore}/100`);
  console.log(`  Toplam Kayıt: ${report.summary.totalRecords}`);
  console.log(`  Mock Veri: ${report.summary.mockRecords} (%${report.summary.mockRatio})`);
  console.log(`  Gerçek Veri: ${report.summary.realRecords} (%${report.summary.realRatio})`);

  // Tenders
  console.log(`\n${"─".repeat(60)}`);
  console.log("  İHALELER");
  console.log(`  Toplam: ${report.tenders.total} | Mock: ${report.tenders.mock} | Gerçek: ${report.tenders.real}`);
  console.log(`  Geçerli: ${report.tenders.validation.validCount} | Hatalı: ${report.tenders.validation.invalidCount} | Uyarı: ${report.tenders.validation.warningCount}`);
  console.log(`  Mükerrer: ${report.tenders.duplicates}`);
  console.log(`  EKAP No Kalıbı: ${report.tenders.mockPatterns.ekapNoPattern}`);

  if (report.tenders.mockPatterns.budgetRange.min > 0) {
    const { min, max, avg } = report.tenders.mockPatterns.budgetRange;
    console.log(`  Bütçe Aralığı: ${min.toLocaleString("tr-TR")} - ${max.toLocaleString("tr-TR")} TL (ort: ${avg.toLocaleString("tr-TR")} TL)`);
  }

  // Top 3 cities
  const topCities = report.tenders.mockPatterns.cityDistribution.slice(0, 5);
  if (topCities.length > 0) {
    console.log(`  Şehir Dağılımı: ${topCities.map((c) => `${c.city} (%${c.percentage})`).join(", ")}`);
  }

  // Type distribution
  if (report.tenders.mockPatterns.typeDistribution.length > 0) {
    console.log(`  Tür Dağılımı: ${report.tenders.mockPatterns.typeDistribution.map((t) => `${t.type} (%${t.percentage})`).join(", ")}`);
  }

  // Low coverage fields
  const lowCoverage = Object.entries(report.tenders.fieldCoverage)
    .filter(([, v]) => v.coverage < 100)
    .sort((a, b) => a[1].coverage - b[1].coverage)
    .slice(0, 5);
  if (lowCoverage.length > 0) {
    console.log("  Eksik Alanlar:");
    for (const [field, v] of lowCoverage) {
      console.log(`    ${field}: %${v.coverage} (${v.filled}/${v.total})`);
    }
  }

  // Companies
  console.log(`\n${"─".repeat(60)}`);
  console.log("  FİRMALAR");
  console.log(`  Toplam: ${report.companies.total} | Mock: ${report.companies.mock} | Gerçek: ${report.companies.real}`);
  console.log(`  Geçerli: ${report.companies.validation.validCount} | Hatalı: ${report.companies.validation.invalidCount}`);

  // Price Indices
  console.log(`\n${"─".repeat(60)}`);
  console.log("  FİYAT ENDEKSLERİ");
  console.log(`  Toplam: ${report.priceIndices.total} | Mock: ${report.priceIndices.mock} | Gerçek: ${report.priceIndices.real}`);

  // Feature Flags
  console.log(`\n${"─".repeat(60)}`);
  console.log("  FEATURE FLAGS");
  for (const flag of report.featureFlags) {
    const status = flag.enabled ? "ACIK" : "KAPALI";
    console.log(`  ${flag.enabled ? "[x]" : "[ ]"} ${flag.name}: ${status} (rollout: %${flag.rollout})`);
  }

  // Recommendations
  if (report.recommendations.length > 0) {
    console.log(`\n${"─".repeat(60)}`);
    console.log("  ÖNERİLER");
    for (const rec of report.recommendations) {
      console.log(`  * ${rec}`);
    }
  }

  console.log("\n" + "═".repeat(60) + "\n");
}
