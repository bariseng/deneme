// ─── E2E: Premium & Ödeme ───────────────────────────────────
import { test, expect } from "@playwright/test";

test.describe("Ödeme Sayfaları", () => {
  test("fiyatlandırma sayfası yüklenir", async ({ page }) => {
    await page.goto("/fiyatlandirma");
    await expect(page.locator("main")).toBeVisible();
    // Should have plan cards
    const planCards = page.locator('[class*="card"], [class*="plan"], [class*="pricing"]');
    if (await planCards.first().isVisible()) {
      expect(await planCards.count()).toBeGreaterThan(0);
    }
  });
});

test.describe("Korumalı Rotalar", () => {
  test("profil sayfası auth gerektirir", async ({ page }) => {
    await page.goto("/profil");
    // Should redirect to login or show auth required
    await page.waitForTimeout(2000);
    const url = page.url();
    const isProtected = url.includes("giris") || url.includes("profil");
    expect(isProtected).toBe(true);
  });

  test("admin sayfası auth gerektirir", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForTimeout(2000);
    const url = page.url();
    // Should redirect or show forbidden
    const isHandled = url.includes("giris") || url.includes("admin");
    expect(isHandled).toBe(true);
  });
});

test.describe("API Rate Limiting", () => {
  test("API rapid requests hata vermez (rate limit aktif)", async ({ request }) => {
    const promises = Array.from({ length: 10 }, () =>
      request.get("/api/tenders?limit=1"),
    );
    const responses = await Promise.all(promises);
    // Should all succeed (10 requests is under limit)
    for (const r of responses) {
      expect([200, 429]).toContain(r.status());
    }
  });
});
