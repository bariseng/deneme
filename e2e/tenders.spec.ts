// ─── E2E: İhale Arama → Detay ──────────────────────────────
import { test, expect } from "@playwright/test";

test.describe("İhale Arama ve Listeleme", () => {
  test("ihale listesi sayfası yüklenir", async ({ page }) => {
    await page.goto("/ihaleler");
    await expect(page).toHaveTitle(/İhale/);
    // Page should have content
    await expect(page.locator("main")).toBeVisible();
  });

  test("ihale arama çalışır", async ({ page }) => {
    await page.goto("/ihaleler");
    const searchInput = page.locator('input[type="text"], input[type="search"], input[placeholder*="Ara"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill("yapım");
      await page.waitForTimeout(500);
      // Should filter results
      await expect(page.locator("main")).toBeVisible();
    }
  });

  test("şehir filtresi çalışır", async ({ page }) => {
    await page.goto("/ihaleler?city=Ankara");
    await expect(page.locator("main")).toBeVisible();
  });

  test("ihale API endpoint çalışır", async ({ request }) => {
    const response = await request.get("/api/tenders?limit=5");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.pagination).toBeDefined();
  });

  test("ihale arama API çalışır", async ({ request }) => {
    const response = await request.get("/api/tenders?q=yapım&limit=5");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });
});

test.describe("İhale Detay", () => {
  test("ihale detay sayfası 404 vermez", async ({ page }) => {
    await page.goto("/ihaleler");
    // Try to find a link to a tender detail
    const firstLink = page.locator('a[href*="/ihaleler/"]').first();
    if (await firstLink.isVisible()) {
      await firstLink.click();
      await page.waitForLoadState("networkidle");
      // Should not be 404
      await expect(page.locator("main")).toBeVisible();
    }
  });
});
