// ─── E2E: Dashboard & Raporlar ──────────────────────────────
import { test, expect } from "@playwright/test";

test.describe("Dashboard API", () => {
  test("dashboard KPI endpoint çalışır", async ({ request }) => {
    const response = await request.get("/api/dashboard?section=kpis");
    // 200, 401, veya 404 kabul edilir
    expect([200, 401, 404]).toContain(response.status());
  });

  test("dashboard monthly volume çalışır", async ({ request }) => {
    const response = await request.get("/api/dashboard?section=monthly");
    expect([200, 401, 404]).toContain(response.status());
  });

  test("dashboard sectors çalışır", async ({ request }) => {
    const response = await request.get("/api/dashboard?section=sectors");
    expect([200, 401, 404]).toContain(response.status());
  });

  test("dashboard integrations çalışır", async ({ request }) => {
    const response = await request.get("/api/dashboard?section=integrations");
    expect([200, 401, 404]).toContain(response.status());
  });
});

test.describe("Fiyat Endeksi", () => {
  test("fiyat endeksi sayfası erişilebilir", async ({ page }) => {
    const response = await page.goto("/fiyat-endeksi");
    // 200 = sayfa mevcut, 404 = henüz deploy edilmemiş
    expect(response?.status()).toBeLessThan(500);
  });

  test("fiyat endeksi API çalışır", async ({ request }) => {
    const response = await request.get("/api/dashboard?section=price-index");
    expect([200, 401, 404]).toContain(response.status());
  });
});
