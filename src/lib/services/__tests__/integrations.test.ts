import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Prisma ────────────────────────────────────────────
const mockPrisma = vi.hoisted(() => ({
  tender: {
    findMany: vi.fn(async () => []),
    findUnique: vi.fn(async () => null),
    update: vi.fn(async () => ({})),
  },
  notification: {
    create: vi.fn(async () => ({ id: "notif-1" })),
  },
  cachedData: {
    findMany: vi.fn(async () => []),
    findUnique: vi.fn(async () => null),
    upsert: vi.fn(async () => ({})),
    create: vi.fn(async () => ({})),
    update: vi.fn(async () => ({})),
    count: vi.fn(async () => 3),
  },
  tenderResult: {
    upsert: vi.fn(async () => ({})),
  },
  signatureRequest: {
    updateMany: vi.fn(async () => ({ count: 1 })),
  },
  $queryRaw: vi.fn(async () => [{ "?column?": 1 }]),
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/providers/cache", () => ({
  ProviderCache: class {
    get = vi.fn(async () => null);
    set = vi.fn(async () => {});
  },
}));
vi.mock("@/lib/providers/ekap-provider", () => ({
  ekapProvider: {
    searchTenders: vi.fn(async () => ({ list: [], toplamKayit: 0 })),
    getTenderDetail: vi.fn(async () => null),
    getDocumentUrl: vi.fn(async () => "https://ekap.kik.gov.tr/doc/123"),
  },
}));

// ─── EKAP Reminder Bot Tests ────────────────────────────────
import { runEkapReminderBot } from "../ekap-reminder";

describe("runEkapReminderBot", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns zero counts when no tenders found", async () => {
    const result = await runEkapReminderBot();
    expect(result.openingReminders).toBe(0);
    expect(result.cancellationAlerts).toBe(0);
    expect(result.resultAlerts).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it("sends opening reminders for tenders with upcoming opening dates", async () => {
    const soon = new Date(Date.now() + 12 * 3600_000); // 12 hours from now
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockPrisma.tender.findMany.mockResolvedValueOnce([
      {
        id: "t-1",
        title: "Test İhale",
        institution: "Test Kurum",
        openingDate: soon,
        favorites: [{ userId: "u-1" }],
        bids: [{ userId: "u-2" }],
      },
    ] as any);

    const result = await runEkapReminderBot();
    expect(result.openingReminders).toBe(2);
    expect(mockPrisma.notification.create).toHaveBeenCalledTimes(2);
  });

  it("handles errors gracefully", async () => {
    mockPrisma.tender.findMany.mockRejectedValueOnce(new Error("DB error"));

    const result = await runEkapReminderBot();
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("DB error");
  });
});

// ─── EKAP Deep Tests ───────────────────────────────────────
import { getDocumentList, checkBanStatus } from "../ekap-deep";

describe("getDocumentList", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns empty for unknown tender", async () => {
    mockPrisma.tender.findUnique.mockResolvedValueOnce(null);
    const docs = await getDocumentList("unknown-id");
    expect(docs).toEqual([]);
  });

  it("returns document list for valid EKAP tender", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockPrisma.tender.findUnique.mockResolvedValueOnce({ ekapNo: "12345" } as any);
    const docs = await getDocumentList("t-1");
    expect(docs.length).toBeGreaterThan(0);
    expect(docs[0]).toHaveProperty("name");
    expect(docs[0]).toHaveProperty("url");
  });
});

describe("checkBanStatus", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns not banned for clean company", async () => {
    const result = await checkBanStatus("Temiz Şirket A.Ş.");
    expect(result.isBanned).toBe(false);
    expect(result.banDetails).toHaveLength(0);
  });
});

// ─── e-Devlet Upload Tests ──────────────────────────────────
import { registerUpload, getUserDocuments, checkDocumentCompleteness } from "../edevlet-upload";

describe("registerUpload", () => {
  beforeEach(() => vi.clearAllMocks());

  it("registers a valid document upload", async () => {
    const doc = await registerUpload("u-1", "vergi_borcu", "vergi.pdf", "/uploads/vergi.pdf", 1024);
    expect(doc.userId).toBe("u-1");
    expect(doc.documentType).toBe("vergi_borcu");
    expect(doc.verificationStatus).toBe("pending");
    expect(mockPrisma.cachedData.upsert).toHaveBeenCalledTimes(1);
  });

  it("throws for invalid document type", async () => {
    await expect(
      registerUpload("u-1", "invalid_type" as never, "test.pdf", "/uploads/test.pdf", 100),
    ).rejects.toThrow("Geçersiz belge türü");
  });
});

describe("getUserDocuments", () => {
  it("returns empty array when no documents", async () => {
    const docs = await getUserDocuments("u-1");
    expect(docs).toEqual([]);
  });
});

describe("checkDocumentCompleteness", () => {
  it("reports missing required documents", async () => {
    const result = await checkDocumentCompleteness("u-1");
    expect(result.complete).toBe(false);
    expect(result.missing.length).toBeGreaterThan(0);
    expect(result.uploaded).toBe(0);
  });
});

// ─── e-İmza Verification Tests ─────────────────────────────
import { verifyDetachedSignature } from "../esign-verify";

describe("verifyDetachedSignature", () => {
  it("returns errors for invalid certificate", () => {
    const result = verifyDetachedSignature(
      Buffer.from("test document"),
      Buffer.from("fake signature"),
      Buffer.from("not a cert"),
    );
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ─── Integration Health Tests ───────────────────────────────
import { checkSystem, checkAllSystems, getIntegrationDashboard } from "../integration-health";

describe("checkSystem", () => {
  it("checks database health", async () => {
    const result = await checkSystem("database");
    expect(result.system).toBe("database");
    expect(result).toHaveProperty("ok");
    expect(result).toHaveProperty("latencyMs");
    expect(result).toHaveProperty("checkedAt");
  });

  it("checks esign health (crypto module)", async () => {
    const result = await checkSystem("esign");
    expect(result.system).toBe("esign");
    expect(result.ok).toBe(true);
  });

  it("checks edevlet health", async () => {
    const result = await checkSystem("edevlet");
    expect(result.system).toBe("edevlet");
    expect(result.ok).toBe(true);
  });
});

describe("checkAllSystems", () => {
  it("returns status for all systems", async () => {
    const results = await checkAllSystems();
    expect(results.length).toBe(5);
    const systems = results.map((r) => r.system);
    expect(systems).toContain("ekap");
    expect(systems).toContain("kep");
    expect(systems).toContain("esign");
    expect(systems).toContain("edevlet");
    expect(systems).toContain("database");
  });
});

describe("getIntegrationDashboard", () => {
  it("returns dashboard summary", async () => {
    const dashboard = await getIntegrationDashboard();
    expect(dashboard).toHaveProperty("allHealthy");
    expect(dashboard).toHaveProperty("systems");
    expect(dashboard).toHaveProperty("unhealthyCount");
    expect(Array.isArray(dashboard.systems)).toBe(true);
  });
});

// ─── KEP Provider Tests ────────────────────────────────────
import { kepHealthCheck } from "../kep-provider";

describe("kepHealthCheck", () => {
  it("returns health status with provider info", async () => {
    const result = await kepHealthCheck();
    expect(result).toHaveProperty("ok");
    expect(result).toHaveProperty("latencyMs");
    expect(result).toHaveProperty("provider");
  });
});
