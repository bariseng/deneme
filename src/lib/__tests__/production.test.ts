import { describe, it, expect, vi } from "vitest";

// ─── Mock Prisma for checklist ──────────────────────────────
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: vi.fn(async () => [{ "?column?": 1 }]),
    tender: { count: vi.fn(async () => 100) },
  },
}));

// ─── ENV Check Tests ────────────────────────────────────────
import { checkProductionEnv, ENV_VARS } from "../production/env-check";

describe("Environment Variable Check", () => {
  it("lists all required env vars", () => {
    const required = ENV_VARS.filter((v) => v.required);
    expect(required.length).toBeGreaterThan(0);
    expect(required.map((v) => v.name)).toContain("DATABASE_URL");
    expect(required.map((v) => v.name)).toContain("NEXTAUTH_SECRET");
    expect(required.map((v) => v.name)).toContain("CRON_SECRET");
  });

  it("reports missing required vars", () => {
    const originalEnv = { ...process.env };
    delete process.env.DATABASE_URL;
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.CRON_SECRET;
    delete process.env.NEXTAUTH_URL;

    const result = checkProductionEnv();
    expect(result.valid).toBe(false);
    expect(result.missing.length).toBeGreaterThan(0);

    process.env = originalEnv;
  });

  it("passes when required vars are set", () => {
    const originalEnv = { ...process.env };
    process.env.DATABASE_URL = "postgresql://test";
    process.env.NEXTAUTH_URL = "https://ihalepro.com";
    process.env.NEXTAUTH_SECRET = "secret123";
    process.env.CRON_SECRET = "cron123";

    const result = checkProductionEnv();
    expect(result.valid).toBe(true);
    expect(result.missing).toHaveLength(0);

    process.env = originalEnv;
  });

  it("categorizes env vars correctly", () => {
    const result = checkProductionEnv();
    expect(result.categories).toHaveProperty("Database");
    expect(result.categories).toHaveProperty("Auth");
    expect(result.categories).toHaveProperty("Monitoring");
    expect(result.categories).toHaveProperty("Cache");
  });
});

// ─── Checklist Tests ────────────────────────────────────────
import { runProductionChecklist } from "../production/checklist";

describe("Production Checklist", () => {
  it("runs all checks and returns results", async () => {
    const result = await runProductionChecklist();
    expect(result.items.length).toBeGreaterThan(0);
    expect(typeof result.passCount).toBe("number");
    expect(typeof result.failCount).toBe("number");
    expect(typeof result.warnCount).toBe("number");
    expect(typeof result.ready).toBe("boolean");
  });

  it("includes critical check categories", async () => {
    const result = await runProductionChecklist();
    const categories = result.items.map((i) => i.category);
    expect(categories).toContain("Güvenlik");
    expect(categories).toContain("SEO");
    expect(categories).toContain("Monitoring");
  });

  it("database check passes with mock", async () => {
    const result = await runProductionChecklist();
    const dbCheck = result.items.find((i) => i.id === "database");
    expect(dbCheck).toBeDefined();
    expect(dbCheck!.status).toBe("pass");
  });

  it("KVKK check passes", async () => {
    const result = await runProductionChecklist();
    const kvkk = result.items.find((i) => i.id === "kvkk");
    expect(kvkk).toBeDefined();
    expect(kvkk!.status).toBe("pass");
  });

  it("rate limiting check passes", async () => {
    const result = await runProductionChecklist();
    const rl = result.items.find((i) => i.id === "rate-limit");
    expect(rl).toBeDefined();
    expect(rl!.status).toBe("pass");
  });
});
