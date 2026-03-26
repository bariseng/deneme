import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Prisma ────────────────────────────────────────────
const mockPrisma = vi.hoisted(() => ({
  securityAuditLog: {
    create: vi.fn(async () => ({ id: "log-1" })),
    findMany: vi.fn(async () => []),
    count: vi.fn(async () => 0),
    deleteMany: vi.fn(async () => ({ count: 5 })),
  },
  twoFactorAuth: {
    findUnique: vi.fn(async () => null),
    upsert: vi.fn(async () => ({ id: "tfa-1" })),
    update: vi.fn(async () => ({ id: "tfa-1" })),
    delete: vi.fn(async () => ({ id: "tfa-1" })),
  },
  user: {
    findUnique: vi.fn(async () => ({ id: "user-1", email: "test@test.com" })),
    update: vi.fn(async () => ({})),
  },
  dataDeletionRequest: {
    create: vi.fn(async () => ({ id: "del-1", status: "TALEP_EDILDI" })),
    findUnique: vi.fn(async () => ({
      id: "del-1", userId: "user-1", dataTypes: ["profil", "teklifler"],
    })),
    findMany: vi.fn(async () => []),
    update: vi.fn(async () => ({})),
  },
  bid: { deleteMany: vi.fn(async () => ({ count: 2 })) },
  favorite: { deleteMany: vi.fn(async () => ({ count: 1 })) },
  application: { deleteMany: vi.fn(async () => ({ count: 0 })) },
  notification: { deleteMany: vi.fn(async () => ({ count: 5 })) },
  searchHistory: { deleteMany: vi.fn(async () => ({ count: 3 })) },
  contract: { findMany: vi.fn(async () => []), deleteMany: vi.fn(async () => ({ count: 0 })) },
  forumReply: { deleteMany: vi.fn(async () => ({ count: 0 })) },
  forumThread: { deleteMany: vi.fn(async () => ({ count: 0 })) },
  cachedData: {
    findUnique: vi.fn(async () => null),
    upsert: vi.fn(async () => ({})),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/security/audit-log", () => ({
  logAudit: vi.fn(async () => {}),
  logLogin: vi.fn(async () => {}),
  logDataDeletion: vi.fn(async () => {}),
  logSuspiciousActivity: vi.fn(async () => {}),
  queryAuditLogs: vi.fn(async () => ({ logs: [], total: 0, page: 1, limit: 50, totalPages: 0 })),
  detectSuspiciousLogin: vi.fn(async () => false),
  archiveOldLogs: vi.fn(async () => ({ archived: 10 })),
}));

// ─── Rate Limit Tests ───────────────────────────────────────
import {
  rateLimitByUser,
  rateLimitByIp,
  rateLimitAuth,
  getClientIp,
  resetStore,
} from "../rate-limit";

describe("rateLimitByUser", () => {
  beforeEach(() => resetStore());

  it("allows requests within limit", () => {
    const result = rateLimitByUser("user-1");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(59);
  });

  it("blocks after exceeding limit", () => {
    for (let i = 0; i < 60; i++) {
      rateLimitByUser("user-2");
    }
    const blocked = rateLimitByUser("user-2");
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("tracks users independently", () => {
    for (let i = 0; i < 60; i++) {
      rateLimitByUser("user-3");
    }
    const otherUser = rateLimitByUser("user-4");
    expect(otherUser.allowed).toBe(true);
  });
});

describe("rateLimitByIp", () => {
  beforeEach(() => resetStore());

  it("allows requests within IP limit", () => {
    const result = rateLimitByIp("1.2.3.4");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(29); // default 30 for IP
  });

  it("blocks IP after exceeding limit", () => {
    for (let i = 0; i < 30; i++) {
      rateLimitByIp("5.6.7.8");
    }
    const blocked = rateLimitByIp("5.6.7.8");
    expect(blocked.allowed).toBe(false);
  });
});

describe("rateLimitAuth", () => {
  beforeEach(() => resetStore());

  it("has stricter limit for auth", () => {
    for (let i = 0; i < 10; i++) {
      rateLimitAuth("9.8.7.6");
    }
    const blocked = rateLimitAuth("9.8.7.6");
    expect(blocked.allowed).toBe(false);
  });
});

describe("getClientIp", () => {
  it("extracts IP from x-forwarded-for", () => {
    const headers = new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
    expect(getClientIp(headers)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip", () => {
    const headers = new Headers({ "x-real-ip": "9.8.7.6" });
    expect(getClientIp(headers)).toBe("9.8.7.6");
  });

  it("returns unknown if no headers", () => {
    expect(getClientIp(new Headers())).toBe("unknown");
  });
});

// ─── Audit Log Tests (via mock validation) ──────────────────
import { logAudit, logLogin, archiveOldLogs } from "@/lib/security/audit-log";

describe("logAudit (mocked)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls the audit log function", async () => {
    await logAudit({ userId: "user-1", action: "test.action", severity: "info" });
    expect(logAudit).toHaveBeenCalledWith({
      userId: "user-1", action: "test.action", severity: "info",
    });
  });
});

describe("logLogin (mocked)", () => {
  it("is callable for login events", async () => {
    await logLogin("user-1", "1.2.3.4", "Chrome", true);
    expect(logLogin).toHaveBeenCalledWith("user-1", "1.2.3.4", "Chrome", true);
  });
});

describe("archiveOldLogs (mocked)", () => {
  it("returns archived count", async () => {
    const result = await archiveOldLogs();
    expect(result.archived).toBe(10);
  });
});

// ─── KVKK Privacy Tests ────────────────────────────────────
import { requestDataDeletion, processDataDeletion, recordConsent } from "../../services/privacy";

describe("requestDataDeletion", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates deletion request with valid types", async () => {
    const result = await requestDataDeletion("user-1", ["profil", "teklifler"], "Test", "1.2.3.4");
    expect(result.status).toBe("TALEP_EDILDI");
    expect(result.remainingDays).toBe(30);
    expect(mockPrisma.dataDeletionRequest.create).toHaveBeenCalledTimes(1);
  });

  it("throws on empty data types", async () => {
    await expect(
      requestDataDeletion("user-1", [], "Test", "1.2.3.4"),
    ).rejects.toThrow("En az bir veri türü seçilmelidir");
  });
});

describe("processDataDeletion", () => {
  it("deletes specified data and marks as completed", async () => {
    const result = await processDataDeletion("del-1");
    expect(result.status).toBe("TAMAMLANDI");
    expect(result.deletedData).toContain("profil");
    expect(result.deletedData).toContain("teklifler");
    expect(mockPrisma.user.update).toHaveBeenCalled();
    expect(mockPrisma.bid.deleteMany).toHaveBeenCalled();
  });
});

describe("recordConsent", () => {
  it("records KVKK consent", async () => {
    await recordConsent("user-1", "aydinlatma_metni", true, "1.2.3.4");
    expect(mockPrisma.cachedData.upsert).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const call = (mockPrisma.cachedData.upsert.mock.calls as any)[0][0];
    expect(call.where.key).toBe("consent:user-1:aydinlatma_metni");
  });

  it("throws on invalid consent type", async () => {
    await expect(
      recordConsent("user-1", "invalid_type", true, "1.2.3.4"),
    ).rejects.toThrow("Geçersiz rıza tipi");
  });
});
