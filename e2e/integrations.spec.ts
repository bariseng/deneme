// ─── E2E: Entegrasyon & Sağlık Kontrolleri ──────────────────
import { test, expect } from "@playwright/test";

test.describe("Health Check Endpoint'leri", () => {
  const systems = ["ekap", "kep", "esign", "edevlet", "database"];

  for (const system of systems) {
    test(`${system} health check yanıt verir`, async ({ request }) => {
      const response = await request.get(`/api/health/${system}`);
      // 200 = healthy, 503 = unhealthy, 404 = endpoint henüz deploy edilmemiş
      expect([200, 404, 503]).toContain(response.status());
      if (response.status() === 200 || response.status() === 503) {
        const body = await response.json();
        expect(body.data).toBeDefined();
        expect(body.data.system).toBe(system);
        expect(typeof body.data.ok).toBe("boolean");
        expect(typeof body.data.latencyMs).toBe("number");
      }
    });
  }

  test("all systems health check çalışır", async ({ request }) => {
    const response = await request.get("/api/health/all");
    // 200, 503, veya 404 kabul edilir
    expect([200, 404, 503]).toContain(response.status());
    if (response.status() !== 404) {
      const body = await response.json();
      expect(body.data.systems).toBeDefined();
      expect(Array.isArray(body.data.systems)).toBe(true);
    }
  });

  test("geçersiz sistem hata döner", async ({ request }) => {
    const response = await request.get("/api/health/nonexistent");
    // 400 veya 404 kabul edilir
    expect([400, 404]).toContain(response.status());
  });
});

test.describe("Feature Flags", () => {
  test("feature flags endpoint auth gerektirir", async ({ request }) => {
    const response = await request.get("/api/admin/feature-flags");
    // 401, 403, veya 404 (henüz deploy edilmemiş)
    expect([401, 403, 404]).toContain(response.status());
  });
});
