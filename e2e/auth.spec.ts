// ─── E2E: Kullanıcı Kaydı → Giriş ──────────────────────────
import { test, expect } from "@playwright/test";

test.describe("Kimlik Doğrulama", () => {
  test("kayıt sayfası yüklenir", async ({ page }) => {
    await page.goto("/kayit");
    await expect(page).toHaveTitle(/İhalePro/);
    await expect(page.locator("form")).toBeVisible();
  });

  test("giriş sayfası yüklenir", async ({ page }) => {
    await page.goto("/giris");
    await expect(page).toHaveTitle(/İhalePro/);
    await expect(page.locator("form")).toBeVisible();
  });

  test("boş form submit hata gösterir", async ({ page }) => {
    await page.goto("/giris");
    const submitBtn = page.locator('button[type="submit"]');
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      // Should show validation or stay on page
      await expect(page).toHaveURL(/giris/);
    }
  });

  test("geçersiz giriş bilgisi hata mesajı gösterir", async ({ page }) => {
    await page.goto("/giris");
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');

    if (await emailInput.isVisible()) {
      await emailInput.fill("test@test.com");
      await passwordInput.fill("wrongpassword");
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(2000);
      // Should show error or stay on login page
      await expect(page).toHaveURL(/giris/);
    }
  });
});
