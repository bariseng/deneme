// ─── E2E: Uluslararası İhaleler (TED) ──────────────────────
import { test, expect } from "@playwright/test";

test.describe("Uluslararası İhaleler", () => {
  test("uluslararası ihaleler sayfası yüklenir", async ({ page }) => {
    await page.goto("/uluslararasi/ihaleler");
    await expect(page).toHaveTitle(/İhalePro/);
    await expect(page.locator("main")).toBeVisible();
  });

  test("ülkeler sayfası yüklenir", async ({ page }) => {
    await page.goto("/uluslararasi/ulkeler");
    await expect(page.locator("main")).toBeVisible();
  });
});

test.describe("JV Eşleştirme", () => {
  test("JV suggestions endpoint auth gerektirir", async ({ request }) => {
    const response = await request.get("/api/jv-matching/suggestions");
    expect([401, 403]).toContain(response.status());
  });
});
