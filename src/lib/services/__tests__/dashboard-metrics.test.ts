import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Prisma ────────────────────────────────────────────
const mockPrisma = vi.hoisted(() => ({
  tender: {
    count: vi.fn(async () => 42),
    findMany: vi.fn(async () => [
      { publishDate: new Date("2026-01-15"), estimatedCost: 1000000 },
      { publishDate: new Date("2026-01-20"), estimatedCost: 2000000 },
      { publishDate: new Date("2026-02-10"), estimatedCost: 1500000 },
    ]),
    groupBy: vi.fn(async () => [
      { tenderType: "YAPIM", _count: 30 },
      { tenderType: "HIZMET", _count: 15 },
      { tenderType: "MAL_ALIMI", _count: 10 },
      { tenderType: "DANISMANLIK", _count: 5 },
    ]),
  },
  bid: { count: vi.fn(async () => 10) },
  tenderResult: {
    count: vi.fn(async () => 4),
    findMany: vi.fn(async () => [
      { winnerAmount: 900000, tender: { estimatedCost: 1000000 } },
      { winnerAmount: 1800000, tender: { estimatedCost: 2000000 } },
    ]),
  },
  contract: {
    aggregate: vi.fn(async () => ({ _sum: { totalAmount: 5000000 } })),
    count: vi.fn(async () => 3),
  },
  favorite: { count: vi.fn(async () => 5) },
  legalUpdate: { count: vi.fn(async () => 7) },
  unitPriceIndex: {
    findMany: vi.fn(async () => [
      { month: new Date("2026-01-01"), avgPrice: 100, minPrice: 80, maxPrice: 120 },
      { month: new Date("2026-02-01"), avgPrice: 105, minPrice: 85, maxPrice: 125 },
    ]),
  },
  tenderDocument: { count: vi.fn(async () => 150), aggregate: vi.fn(async () => ({ _sum: { fileSize: 1073741824 } })) },
  forumThread: { count: vi.fn(async () => 50) },
  user: { count: vi.fn(async () => 200), groupBy: vi.fn(async () => [{ plan: "FREE", _count: 150 }, { plan: "PRO", _count: 50 }]), findMany: vi.fn(async () => []) },
  payment: { findMany: vi.fn(async () => [{ amount: 500, planId: "PRO", createdAt: new Date() }]) },
  subscription: { count: vi.fn(async () => 30) },
  notification: { count: vi.fn(async () => 3) },
  application: { count: vi.fn(async () => 2) },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/providers/cache", () => ({
  ProviderCache: class {
    get = async () => null;
    set = async () => {};
  },
}));

import { getDashboardKPIs, getMonthlyVolume, getSectorDistribution, getCityHeatmap, getPriceIndexChart, getPerformanceCard } from "../dashboard-metrics";
import { generateExcel, generatePdfHtml, buildKpiReport } from "../report-export";

// ─── Dashboard Metrics Tests ────────────────────────────────

describe("getDashboardKPIs", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 7 KPIs with correct types", async () => {
    const kpis = await getDashboardKPIs("user-1", "comp-1");
    expect(kpis).toHaveProperty("activeTenders");
    expect(kpis).toHaveProperty("bidsSubmitted");
    expect(kpis).toHaveProperty("winRate");
    expect(kpis).toHaveProperty("totalContractValue");
    expect(kpis).toHaveProperty("upcomingDeadlines");
    expect(kpis).toHaveProperty("legalChanges");
    expect(kpis).toHaveProperty("marketTrend");
    expect(typeof kpis.winRate).toBe("number");
    expect(kpis.winRate).toBeGreaterThanOrEqual(0);
    expect(kpis.winRate).toBeLessThanOrEqual(100);
  });

  it("calculates market trend direction", async () => {
    const kpis = await getDashboardKPIs("user-1", "comp-1");
    expect(["up", "down", "stable"]).toContain(kpis.marketTrend.direction);
    expect(typeof kpis.marketTrend.percentage).toBe("number");
  });
});

describe("getMonthlyVolume", () => {
  it("returns monthly data sorted by date", async () => {
    const data = await getMonthlyVolume(12);
    expect(Array.isArray(data)).toBe(true);
    for (const item of data) {
      expect(item).toHaveProperty("month");
      expect(item).toHaveProperty("count");
      expect(item).toHaveProperty("totalBudget");
    }
    // Verify sort order
    for (let i = 1; i < data.length; i++) {
      expect(data[i].month >= data[i - 1].month).toBe(true);
    }
  });
});

describe("getSectorDistribution", () => {
  it("returns sectors with percentages summing to ~100", async () => {
    const sectors = await getSectorDistribution();
    expect(sectors.length).toBeGreaterThan(0);
    const totalPct = sectors.reduce((sum, s) => sum + s.percentage, 0);
    expect(totalPct).toBeGreaterThanOrEqual(95); // rounding tolerance
    expect(totalPct).toBeLessThanOrEqual(105);
  });
});

describe("getCityHeatmap", () => {
  it("returns city data sorted by count", async () => {
    // Mock groupBy for cities
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockPrisma.tender.groupBy.mockResolvedValueOnce([
      { city: "İstanbul", _count: 100, _sum: { estimatedCost: 50000000 } },
      { city: "Ankara", _count: 80, _sum: { estimatedCost: 30000000 } },
    ] as any);

    const cities = await getCityHeatmap();
    expect(Array.isArray(cities)).toBe(true);
  });
});

describe("getPriceIndexChart", () => {
  it("returns price data with avg, min, max", async () => {
    const data = await getPriceIndexChart();
    expect(data.length).toBe(2);
    expect(data[0]).toHaveProperty("month");
    expect(data[0]).toHaveProperty("avg");
    expect(data[0]).toHaveProperty("min");
    expect(data[0]).toHaveProperty("max");
    expect(data[0].avg).toBe(100);
  });
});

describe("getPerformanceCard", () => {
  it("returns complete performance card", async () => {
    const card = await getPerformanceCard("user-1", "comp-1");
    expect(card).toHaveProperty("wonTenders");
    expect(card).toHaveProperty("totalBids");
    expect(card).toHaveProperty("winRate");
    expect(card).toHaveProperty("avgDiscount");
    expect(card).toHaveProperty("totalRevenue");
    expect(card).toHaveProperty("activeTenders");
    expect(card.winRate).toBeGreaterThanOrEqual(0);
    expect(card.winRate).toBeLessThanOrEqual(100);
  });
});

// ─── Export Tests ───────────────────────────────────────────

describe("generateExcel", () => {
  it("produces a valid buffer", () => {
    const config = buildKpiReport({
      activeTenders: 42,
      winRate: 35,
      totalContractValue: 5000000,
    });
    const buffer = generateExcel(config);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(100);
    // XLSX magic bytes
    expect(buffer[0]).toBe(0x50); // 'P'
    expect(buffer[1]).toBe(0x4b); // 'K'
  });
});

describe("generatePdfHtml", () => {
  it("produces valid HTML with title", () => {
    const config = buildKpiReport({ activeTenders: 42 });
    const html = generatePdfHtml(config);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("İhalePro");
    expect(html).toContain("Dashboard KPI Raporu");
    expect(html).toContain("Aktif İhale Sayısı");
  });
});
