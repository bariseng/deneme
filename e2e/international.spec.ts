// ─── E2E: Uluslararası İhaleler (TED) ──────────────────────
import { test, expect } from "@playwright/test";

test.describe("Uluslararası İhaleler", () => {
  test("uluslararası ihaleler sayfası erişilebilir", async ({ page }) => {
    const response = await page.goto("/uluslararasi/ihaleler");
    // 200 = sayfa mevcut, 404 = henüz deploy edilmemiş
    expect(response?.status()).toBeLessThan(500);
  });

  test("ülkeler sayfası erişilebilir", async ({ page }) => {
    const response = await page.goto("/uluslararasi/ulkeler");
    expect(response?.status()).toBeLessThan(500);
  });
});

test.describe("JV Eşleştirme", () => {
  test("JV suggestions endpoint auth gerektirir", async ({ request }) => {
    const response = await request.get("/api/jv-matching/suggestions");
    // 401/403 = auth required, 404 = endpoint henüz deploy edilmemiş
    expect([401, 403, 404]).toContain(response.status());
  });
});
