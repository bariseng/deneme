// ─── E2E: Dashboard & Raporlar ──────────────────────────────
import { test, expect } from "@playwright/test";

test.describe("Dashboard API", () => {
  test("dashboard KPI endpoint çalışır", async ({ request }) => {
    const response = await request.get("/api/dashboard?section=kpis");
    // 401 without auth is expected
    expect([200, 401]).toContain(response.status());
  });

  test("dashboard monthly volume çalışır", async ({ request }) => {
    const response = await request.get("/api/dashboard?section=monthly");
    expect([200, 401]).toContain(response.status());
  });

  test("dashboard sectors çalışır", async ({ request }) => {
    const response = await request.get("/api/dashboard?section=sectors");
    expect([200, 401]).toContain(response.status());
  });

  test("dashboard integrations çalışır", async ({ request }) => {
    const response = await request.get("/api/dashboard?section=integrations");
    expect([200, 401]).toContain(response.status());
  });
});

test.describe("Fiyat Endeksi", () => {
  test("fiyat endeksi sayfası yüklenir", async ({ page }) => {
    await page.goto("/fiyat-endeksi");
    await expect(page.locator("main")).toBeVisible();
  });

  test("fiyat endeksi API çalışır", async ({ request }) => {
    const response = await request.get("/api/dashboard?section=price-index");
    expect([200, 401]).toContain(response.status());
  });
});
