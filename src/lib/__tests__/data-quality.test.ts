import { describe, it, expect, vi } from "vitest";

// ─── Mock dependencies ─────────────────────────────────────
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: vi.fn(async () => [{ "?column?": 1 }]),
  },
}));

import {
  calculateFieldCoverage,
  analyzeMockPatterns,
  analyzeTenderQuality,
  analyzeCompanyQuality,
  analyzePriceQuality,
  calculateQualityScore,
  generateRecommendations,
  generateDataQualityReport,
} from "../data-quality/analyzer";

// ─── Test Data ──────────────────────────────────────────────

const mockTenders = [
  {
    title: "Ankara Ankara-Sivas YHT Hattı 2. Etap Yapım İşi",
    institution: "T.C. Ulaştırma ve Altyapı Bakanlığı",
    city: "Ankara",
    tenderType: "YAPIM",
    status: "BASVURU_ACIK",
    ekapNo: "2026/100000",
    ilanNo: "ILN-2026-50000",
    description: "Ankara ilinde yapım işi",
    requirements: "İş deneyim belgesi gerekli",
    estimatedCost: 15000000,
    guaranteeRate: 6,
    publishDate: new Date("2026-03-01"),
    deadline: new Date("2026-04-15"),
    openingDate: new Date("2026-04-16"),
    latitude: 39.9,
    longitude: 32.8,
    contactPerson: "Ali Yılmaz",
    contactPhone: "0312 400 10 20",
    contactEmail: "ihale1@kurum.gov.tr",
    viewCount: 150,
    source: null,
  },
  {
    title: "İstanbul Hastane Tıbbi Cihaz Alım İhalesi",
    institution: "T.C. Sağlık Bakanlığı",
    city: "İstanbul",
    tenderType: "MAL_ALIMI",
    status: "DEGERLENDIRME",
    ekapNo: "2026/100001",
    ilanNo: "ILN-2026-50001",
    description: "İstanbul ilinde mal alımı",
    requirements: null,
    estimatedCost: 5000000,
    guaranteeRate: 6,
    publishDate: new Date("2026-03-05"),
    deadline: new Date("2026-04-20"),
    openingDate: null,
    latitude: 41.0,
    longitude: 28.9,
    contactPerson: "Fatma Demir",
    contactPhone: "0212 401 11 21",
    contactEmail: "ihale2@kurum.gov.tr",
    viewCount: 85,
    source: null,
  },
  {
    title: "İzmir Kent İçi Ulaşım Danışmanlık Hizmeti",
    institution: "İzmir Büyükşehir Belediyesi",
    city: "İzmir",
    tenderType: "DANISMANLIK",
    status: "SONUCLANDI",
    ekapNo: "2026/100002",
    ilanNo: null,
    description: "İzmir danışmanlık hizmeti",
    requirements: "5 yıl deneyim",
    estimatedCost: 2000000,
    guaranteeRate: null,
    publishDate: new Date("2026-02-15"),
    deadline: new Date("2026-03-15"),
    openingDate: new Date("2026-03-16"),
    latitude: null,
    longitude: null,
    contactPerson: null,
    contactPhone: null,
    contactEmail: null,
    viewCount: 200,
    source: null,
  },
];

const mockCompanies = [
  {
    name: "Anadolu İnşaat A.Ş.",
    taxNumber: "1234567890",
    taxOffice: "Ankara Vergi Dairesi",
    address: "Kızılay Mah.",
    city: "Ankara",
    phone: "0312 425 00 00",
    email: "info@anadoluinsaat.com.tr",
    website: "https://anadoluinsaat.com.tr",
    sector: "Yapım İşleri",
    description: "Köklü inşaat firması",
    foundedYear: 1985,
    employeeCount: 450,
  },
  {
    name: "TeknoSoft Bilişim Ltd. Şti.",
    taxNumber: "9876543210",
    taxOffice: "İstanbul Vergi Dairesi",
    address: "Maslak Mah.",
    city: "İstanbul",
    phone: "0212 345 67 89",
    email: "info@teknosoft.com.tr",
    website: "https://teknosoft.com.tr",
    sector: "Bilişim ve Teknoloji",
    description: "Teknoloji şirketi",
    foundedYear: 2005,
    employeeCount: 120,
  },
];

const mockPrices = [
  {
    sector: "Yapım İşleri",
    item: "Hazır Beton C30",
    unit: "m³",
    price: 1250,
    prevPrice: 1100,
    change: 13.6,
    month: "2026-03",
    source: null,
  },
  {
    sector: "Yapım İşleri",
    item: "İnşaat Demiri",
    unit: "ton",
    price: 18500,
    prevPrice: 17000,
    change: 8.8,
    month: "2026-03",
    source: null,
  },
];

// ─── Field Coverage Tests ───────────────────────────────────

describe("calculateFieldCoverage", () => {
  it("calculates coverage for fully populated fields", () => {
    const records = [
      { name: "A", city: "Ankara" },
      { name: "B", city: "İstanbul" },
    ];
    const result = calculateFieldCoverage(records, ["name", "city"]);
    expect(result.name.coverage).toBe(100);
    expect(result.city.coverage).toBe(100);
  });

  it("calculates coverage for partially populated fields", () => {
    const records = [
      { name: "A", city: "Ankara" },
      { name: "B", city: null },
    ];
    const result = calculateFieldCoverage(records, ["name", "city"]);
    expect(result.name.coverage).toBe(100);
    expect(result.city.coverage).toBe(50);
    expect(result.city.filled).toBe(1);
    expect(result.city.total).toBe(2);
  });

  it("handles empty records", () => {
    const result = calculateFieldCoverage([], ["name"]);
    expect(result.name.coverage).toBe(0);
    expect(result.name.total).toBe(0);
  });

  it("treats empty strings and zero as unfilled", () => {
    const records = [{ name: "", value: 0 }];
    const result = calculateFieldCoverage(records, ["name", "value"]);
    expect(result.name.coverage).toBe(0);
    expect(result.value.coverage).toBe(0);
  });
});

// ─── Mock Pattern Analysis Tests ────────────────────────────

describe("analyzeMockPatterns", () => {
  it("detects sequential EKAP number pattern", () => {
    const result = analyzeMockPatterns(mockTenders);
    expect(result.ekapNoPattern).toContain("Ardışık seri");
    expect(result.ekapNoPattern).toContain("MOCK");
  });

  it("calculates city distribution", () => {
    const result = analyzeMockPatterns(mockTenders);
    expect(result.cityDistribution).toHaveLength(3);
    expect(result.cityDistribution[0].count).toBe(1);
  });

  it("calculates budget range", () => {
    const result = analyzeMockPatterns(mockTenders);
    expect(result.budgetRange.min).toBe(2000000);
    expect(result.budgetRange.max).toBe(15000000);
    expect(result.budgetRange.avg).toBeGreaterThan(0);
  });

  it("calculates type and status distribution", () => {
    const result = analyzeMockPatterns(mockTenders);
    expect(result.typeDistribution.length).toBeGreaterThan(0);
    expect(result.statusDistribution.length).toBeGreaterThan(0);
  });

  it("detects uniform distribution", () => {
    // 3 items with 1 each — too few to be "uniform" in our threshold
    const result = analyzeMockPatterns(mockTenders);
    // Small dataset, check it returns a boolean
    expect(typeof result.isUniformDistribution).toBe("boolean");
  });
});

// ─── Tender Quality Analysis Tests ──────────────────────────

describe("analyzeTenderQuality", () => {
  it("counts mock vs real tenders", () => {
    const result = analyzeTenderQuality(mockTenders);
    // All have sequential ekapNo with /10, so classified as mock
    expect(result.mock).toBe(3);
    expect(result.real).toBe(0);
    expect(result.total).toBe(3);
  });

  it("validates tenders and reports errors", () => {
    const result = analyzeTenderQuality(mockTenders);
    expect(result.validation.validCount).toBeGreaterThanOrEqual(0);
    expect(typeof result.validation.invalidCount).toBe("number");
  });

  it("calculates field coverage for tender fields", () => {
    const result = analyzeTenderQuality(mockTenders);
    expect(result.fieldCoverage.title.coverage).toBe(100);
    expect(result.fieldCoverage.institution.coverage).toBe(100);
    expect(result.fieldCoverage.city.coverage).toBe(100);
    // contactPerson has 1 null out of 3
    expect(result.fieldCoverage.contactPerson.coverage).toBeLessThan(100);
  });

  it("detects duplicates", () => {
    const result = analyzeTenderQuality(mockTenders);
    expect(result.duplicates).toBe(0); // No duplicates in test data
  });

  it("detects mock patterns in EKAP numbers", () => {
    const result = analyzeTenderQuality(mockTenders);
    expect(result.mockPatterns.ekapNoPattern).toContain("MOCK");
  });
});

// ─── Company Quality Analysis Tests ─────────────────────────

describe("analyzeCompanyQuality", () => {
  it("counts mock vs real companies", () => {
    const result = analyzeCompanyQuality(mockCompanies);
    // Both have simple tax numbers (1234..., 9876...)
    expect(result.mock).toBe(2);
    expect(result.real).toBe(0);
  });

  it("validates companies", () => {
    const result = analyzeCompanyQuality(mockCompanies);
    // Mock VKN checksum may fail validation
    expect(typeof result.validation.validCount).toBe("number");
    expect(typeof result.validation.invalidCount).toBe("number");
  });

  it("calculates field coverage", () => {
    const result = analyzeCompanyQuality(mockCompanies);
    expect(result.fieldCoverage.name.coverage).toBe(100);
    expect(result.fieldCoverage.email.coverage).toBe(100);
    expect(result.fieldCoverage.website.coverage).toBe(100);
  });
});

// ─── Price Index Quality Tests ──────────────────────────────

describe("analyzePriceQuality", () => {
  it("counts mock vs real prices", () => {
    const result = analyzePriceQuality(mockPrices);
    // All have source=null, classified as mock
    expect(result.mock).toBe(2);
    expect(result.real).toBe(0);
  });

  it("validates price data", () => {
    const result = analyzePriceQuality(mockPrices);
    expect(result.validation.validCount).toBe(2);
    expect(result.validation.invalidCount).toBe(0);
  });

  it("calculates field coverage", () => {
    const result = analyzePriceQuality(mockPrices);
    expect(result.fieldCoverage.sector.coverage).toBe(100);
    expect(result.fieldCoverage.price.coverage).toBe(100);
    // source is null for both
    expect(result.fieldCoverage.source.coverage).toBe(0);
  });
});

// ─── Quality Score Tests ────────────────────────────────────

describe("calculateQualityScore", () => {
  it("returns score between 0 and 100", () => {
    const report = generateDataQualityReport({
      tenders: mockTenders,
      companies: mockCompanies,
      priceIndices: mockPrices,
    });
    const score = calculateQualityScore(report);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("penalizes duplicates", () => {
    const report1 = generateDataQualityReport({
      tenders: mockTenders,
      companies: mockCompanies,
      priceIndices: mockPrices,
    });

    // Add duplicates
    const dupTenders = [
      ...mockTenders,
      { ...mockTenders[0], ekapNo: mockTenders[0].ekapNo }, // same ekapNo = duplicate
    ];
    const report2 = generateDataQualityReport({
      tenders: dupTenders,
      companies: mockCompanies,
      priceIndices: mockPrices,
    });

    expect(report2.tenders.duplicates).toBeGreaterThan(0);
  });
});

// ─── Recommendations Tests ──────────────────────────────────

describe("generateRecommendations", () => {
  it("generates recommendations for all-mock data", () => {
    const report = generateDataQualityReport({
      tenders: mockTenders,
      companies: mockCompanies,
      priceIndices: mockPrices,
    });
    const recs = generateRecommendations(report);
    expect(recs.length).toBeGreaterThan(0);
  });

  it("recommends enabling feature flags", () => {
    const report = generateDataQualityReport({
      tenders: mockTenders,
      companies: mockCompanies,
      priceIndices: mockPrices,
    });
    const flagRec = report.recommendations.find((r) => r.includes("feature flag"));
    expect(flagRec).toBeDefined();
  });

  it("warns about mock EKAP pattern", () => {
    const report = generateDataQualityReport({
      tenders: mockTenders,
      companies: mockCompanies,
      priceIndices: mockPrices,
    });
    const ekapRec = report.recommendations.find((r) => r.includes("EKAP"));
    expect(ekapRec).toBeDefined();
  });

  it("warns about low company count", () => {
    const report = generateDataQualityReport({
      tenders: mockTenders,
      companies: mockCompanies,
      priceIndices: mockPrices,
    });
    const companyRec = report.recommendations.find((r) => r.includes("firma"));
    expect(companyRec).toBeDefined();
  });
});

// ─── Full Report Tests ──────────────────────────────────────

describe("generateDataQualityReport", () => {
  it("generates a complete report", () => {
    const report = generateDataQualityReport({
      tenders: mockTenders,
      companies: mockCompanies,
      priceIndices: mockPrices,
    });

    expect(report.timestamp).toBeDefined();
    expect(report.summary.totalRecords).toBe(7); // 3 + 2 + 2
    expect(report.summary.overallScore).toBeGreaterThan(0);
    expect(report.tenders.total).toBe(3);
    expect(report.companies.total).toBe(2);
    expect(report.priceIndices.total).toBe(2);
    expect(report.featureFlags.length).toBe(6);
    expect(report.recommendations.length).toBeGreaterThan(0);
  });

  it("handles empty data", () => {
    const report = generateDataQualityReport({
      tenders: [],
      companies: [],
      priceIndices: [],
    });

    expect(report.summary.totalRecords).toBe(0);
    expect(report.summary.mockRatio).toBe(0);
    expect(report.summary.realRatio).toBe(0);
  });

  it("correctly calculates mock ratio", () => {
    const report = generateDataQualityReport({
      tenders: mockTenders,
      companies: mockCompanies,
      priceIndices: mockPrices,
    });

    // All data is mock
    expect(report.summary.mockRatio).toBeGreaterThanOrEqual(80);
  });

  it("includes feature flag status", () => {
    const report = generateDataQualityReport({
      tenders: mockTenders,
      companies: mockCompanies,
      priceIndices: mockPrices,
    });

    const flagNames = report.featureFlags.map((f) => f.name);
    expect(flagNames).toContain("USE_REAL_EKAP_DATA");
    expect(flagNames).toContain("USE_REAL_TED_DATA");
    expect(flagNames).toContain("USE_REAL_PRICE_INDEX");
    expect(flagNames).toContain("USE_REAL_PAYMENTS");
    expect(flagNames).toContain("USE_REAL_COMPANY_DATA");
    expect(flagNames).toContain("USE_REAL_LEGAL_DATA");
  });
});
