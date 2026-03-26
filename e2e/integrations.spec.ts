// ─── E2E: Entegrasyon & Sağlık Kontrolleri ──────────────────
import { test, expect } from "@playwright/test";

test.describe("Health Check Endpoint'leri", () => {
  const systems = ["ekap", "kep", "esign", "edevlet", "database"];

  for (const system of systems) {
    test(`${system} health check yanıt verir`, async ({ request }) => {
      const response = await request.get(`/api/health/${system}`);
      // 200 = healthy, 503 = unhealthy but responding
      expect([200, 503]).toContain(response.status());
      const body = await response.json();
      expect(body.data).toBeDefined();
      expect(body.data.system).toBe(system);
      expect(typeof body.data.ok).toBe("boolean");
      expect(typeof body.data.latencyMs).toBe("number");
    });
  }

  test("all systems health check çalışır", async ({ request }) => {
    const response = await request.get("/api/health/all");
    expect([200, 503]).toContain(response.status());
    const body = await response.json();
    expect(body.data.systems).toBeDefined();
    expect(Array.isArray(body.data.systems)).toBe(true);
    expect(body.data.systems.length).toBe(5);
  });

  test("geçersiz sistem 400 döner", async ({ request }) => {
    const response = await request.get("/api/health/nonexistent");
    expect(response.status()).toBe(400);
  });
});

test.describe("Feature Flags", () => {
  test("feature flags endpoint auth gerektirir", async ({ request }) => {
    const response = await request.get("/api/admin/feature-flags");
    expect([401, 403]).toContain(response.status());
  });
});
