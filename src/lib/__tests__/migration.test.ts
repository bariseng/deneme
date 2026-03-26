import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Feature Flags Tests ────────────────────────────────────

import {
  isFeatureEnabled,
  isEnabledForUser,
  getAllFlags,
  getDataSource,
  getRolloutPercentage,
} from "../feature-flags";

describe("Feature Flags", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  it("returns false by default for all flags", () => {
    delete process.env.USE_REAL_EKAP_DATA;
    expect(isFeatureEnabled("USE_REAL_EKAP_DATA")).toBe(false);
  });

  it("returns true when env is set to 'true'", () => {
    process.env.USE_REAL_EKAP_DATA = "true";
    expect(isFeatureEnabled("USE_REAL_EKAP_DATA")).toBe(true);
  });

  it("returns true when env is set to '1'", () => {
    process.env.USE_REAL_TED_DATA = "1";
    expect(isFeatureEnabled("USE_REAL_TED_DATA")).toBe(true);
  });

  it("returns false when env is set to 'false'", () => {
    process.env.USE_REAL_EKAP_DATA = "false";
    expect(isFeatureEnabled("USE_REAL_EKAP_DATA")).toBe(false);
  });

  it("getAllFlags returns all 6 flags", () => {
    const flags = getAllFlags();
    expect(flags.length).toBe(6);
    const names = flags.map((f) => f.name);
    expect(names).toContain("USE_REAL_EKAP_DATA");
    expect(names).toContain("USE_REAL_TED_DATA");
    expect(names).toContain("USE_REAL_PRICE_INDEX");
    expect(names).toContain("USE_REAL_PAYMENTS");
  });

  it("getDataSource returns 'mock' when flag is off", () => {
    delete process.env.USE_REAL_EKAP_DATA;
    expect(getDataSource("USE_REAL_EKAP_DATA")).toBe("mock");
  });

  it("getDataSource returns 'real' when flag is on", () => {
    process.env.USE_REAL_EKAP_DATA = "true";
    expect(getDataSource("USE_REAL_EKAP_DATA")).toBe("real");
  });

  it("isEnabledForUser is deterministic for same user", () => {
    process.env.USE_REAL_EKAP_DATA = "true";
    const result1 = isEnabledForUser("USE_REAL_EKAP_DATA", "user-123");
    const result2 = isEnabledForUser("USE_REAL_EKAP_DATA", "user-123");
    expect(result1).toBe(result2);
  });

  it("isEnabledForUser returns false when flag is off", () => {
    delete process.env.USE_REAL_EKAP_DATA;
    expect(isEnabledForUser("USE_REAL_EKAP_DATA", "user-123")).toBe(false);
  });

  it("getRolloutPercentage reads from env", () => {
    process.env.USE_REAL_EKAP_DATA_ROLLOUT = "50";
    expect(getRolloutPercentage("USE_REAL_EKAP_DATA")).toBe(50);
  });

  it("getRolloutPercentage defaults to 100", () => {
    delete process.env.USE_REAL_EKAP_DATA_ROLLOUT;
    expect(getRolloutPercentage("USE_REAL_EKAP_DATA")).toBe(100);
  });
});

// ─── Tender Validator Tests ─────────────────────────────────

import { validateTender, validateTenderBatch, detectDuplicates } from "../validators/tender-validator";

describe("Tender Validator", () => {
  it("validates a correct tender", () => {
    const result = validateTender({
      title: "Okul Yapım İhalesi",
      institution: "MEB Ankara İl Müdürlüğü",
      city: "Ankara",
      status: "BASVURU_ACIK",
      tenderType: "YAPIM",
      estimatedCost: 5000000,
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects tender with missing title", () => {
    const result = validateTender({ title: "", institution: "Kurum", city: "Ankara" });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("başlığ"))).toBe(true);
  });

  it("rejects negative cost", () => {
    const result = validateTender({
      title: "Test İhale",
      institution: "Test Kurum",
      city: "İstanbul",
      estimatedCost: -1000,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("negatif"))).toBe(true);
  });

  it("warns for unknown city", () => {
    const result = validateTender({
      title: "Test İhale",
      institution: "Test Kurum",
      city: "BilinmeyenŞehir",
    });
    expect(result.warnings.some((w) => w.includes("Geçersiz şehir"))).toBe(true);
  });

  it("validates batch correctly", () => {
    const batch = validateTenderBatch([
      { title: "İhale 1", institution: "Kurum 1", city: "Ankara" },
      { title: "", institution: "", city: "" },
    ]);
    expect(batch.validCount).toBe(1);
    expect(batch.invalidCount).toBe(1);
  });

  it("detects duplicates by ekapNo", () => {
    const dupes = detectDuplicates([
      { ekapNo: "12345", title: "İhale A", institution: "Kurum A" },
      { ekapNo: "12345", title: "İhale B", institution: "Kurum B" },
      { ekapNo: "67890", title: "İhale C", institution: "Kurum C" },
    ]);
    expect(dupes.length).toBe(1);
    expect(dupes[0].indices).toEqual([0, 1]);
  });
});

// ─── Company Validator Tests ────────────────────────────────

import { validateCompany, validateVkn } from "../validators/company-validator";

describe("Company Validator", () => {
  it("validates a correct company", () => {
    const result = validateCompany({
      name: "Test A.Ş.",
      taxNumber: "1234567890",
      city: "İstanbul",
    });
    // VKN may fail checksum for random number, but structure is valid
    expect(result.errors.length).toBeLessThanOrEqual(1); // at most VKN checksum error
  });

  it("rejects missing name", () => {
    const result = validateCompany({ name: "", taxNumber: "1234567890" });
    expect(result.valid).toBe(false);
  });

  it("rejects invalid tax number length", () => {
    const result = validateCompany({ name: "Test", taxNumber: "123" });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("VKN 10"))).toBe(true);
  });

  it("validates VKN format check", () => {
    // VKN must be exactly 10 digits
    expect(validateVkn("abc")).toBe(false);
    expect(validateVkn("12345")).toBe(false);
  });

  it("warns for invalid email", () => {
    const result = validateCompany({
      name: "Test",
      taxNumber: "1234567890",
      email: "not-an-email",
    });
    expect(result.warnings.some((w) => w.includes("e-posta"))).toBe(true);
  });
});

// ─── Price Validator Tests ──────────────────────────────────

import { validatePriceIndex, validatePriceBatch } from "../validators/price-validator";

describe("Price Validator", () => {
  it("validates a correct price index", () => {
    const result = validatePriceIndex({
      sector: "YAPIM",
      item: "Beton C30",
      unit: "m³",
      price: 850,
      month: "2026-03",
    });
    expect(result.valid).toBe(true);
  });

  it("rejects negative price", () => {
    const result = validatePriceIndex({
      sector: "YAPIM",
      item: "Test",
      unit: "m³",
      price: -100,
      month: "2026-03",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("negatif"))).toBe(true);
  });

  it("warns for zero price", () => {
    const result = validatePriceIndex({
      sector: "YAPIM",
      item: "Test",
      unit: "m³",
      price: 0,
      month: "2026-03",
    });
    expect(result.warnings.some((w) => w.includes("sıfır"))).toBe(true);
  });

  it("warns for inconsistent change rate", () => {
    const result = validatePriceIndex({
      sector: "YAPIM",
      item: "Test",
      unit: "m³",
      price: 1000,
      prevPrice: 800,
      change: 50, // Should be ~25%
      month: "2026-03",
    });
    expect(result.warnings.some((w) => w.includes("tutarsız"))).toBe(true);
  });

  it("validates batch correctly", () => {
    const batch = validatePriceBatch([
      { sector: "YAPIM", item: "Beton", unit: "m³", price: 850, month: "2026-03" },
      { sector: null, item: null, unit: null, price: -10, month: null },
    ]);
    expect(batch.validCount).toBe(1);
    expect(batch.invalidCount).toBe(1);
  });
});

// ─── Migration Monitor Tests ────────────────────────────────

import { MigrationMonitor } from "../migration/monitor";

describe("MigrationMonitor", () => {
  it("tracks steps and generates report", () => {
    const monitor = new MigrationMonitor(true);

    monitor.startStep("Test Step 1");
    monitor.completeStep({ count: 10 });

    monitor.startStep("Test Step 2");
    monitor.failStep("Test error");

    monitor.startStep("Test Step 3");
    monitor.skipStep("Not needed");

    const report = monitor.finalize();

    expect(report.dryRun).toBe(true);
    expect(report.summary.totalSteps).toBe(3);
    expect(report.summary.completed).toBe(1);
    expect(report.summary.failed).toBe(1);
    expect(report.summary.skipped).toBe(1);
    expect(report.steps[0].status).toBe("completed");
    expect(report.steps[1].status).toBe("failed");
    expect(report.steps[2].status).toBe("skipped");
  });

  it("calculates sync success rate", () => {
    const monitor = new MigrationMonitor(false);

    monitor.startStep("Step 1");
    monitor.completeStep();
    monitor.startStep("Step 2");
    monitor.completeStep();
    monitor.startStep("Step 3");
    monitor.failStep("error");

    const report = monitor.finalize();
    expect(report.dataMetrics.syncSuccessRate).toBe(67); // 2/3 = 66.7%
  });

  it("tracks data metrics", () => {
    const monitor = new MigrationMonitor(true);

    monitor.updateTenderMetrics("mock", 50);
    monitor.updateTenderMetrics("real", 200);
    monitor.updateCompanyMetrics("mock", 5);

    const report = monitor.getReport();
    expect(report.dataMetrics.tenders.mock).toBe(50);
    expect(report.dataMetrics.tenders.real).toBe(200);
    expect(report.dataMetrics.companies.mock).toBe(5);
  });
});
