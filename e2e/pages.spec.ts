// ─── E2E: Sayfa Yükleme & SEO ───────────────────────────────
import { test, expect } from "@playwright/test";

test.describe("Ana Sayfalar Yükleniyor", () => {
  const pages = [
    { path: "/", title: /İhalePro|ihalepro/ },
    { path: "/ihaleler", title: /İhale/ },
    { path: "/fiyat-endeksi", title: /İhalePro/ },
    { path: "/takvim", title: /İhalePro/ },
    { path: "/topluluk", title: /İhalePro/ },
    { path: "/raporlar", title: /İhalePro/ },
    { path: "/uluslararasi", title: /İhalePro/ },
  ];

  for (const p of pages) {
    test(`${p.path} sayfası yüklenir`, async ({ page }) => {
      const response = await page.goto(p.path);
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator("main")).toBeVisible();
    });
  }
});

test.describe("SEO & Meta", () => {
  test("robots.txt erişilebilir", async ({ request }) => {
    const response = await request.get("/robots.txt");
    expect(response.status()).toBe(200);
    const text = await response.text();
    expect(text).toContain("User-Agent");
    expect(text).toContain("Sitemap");
  });

  test("sitemap.xml erişilebilir", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.status()).toBe(200);
    const text = await response.text();
    expect(text).toContain("<?xml");
    expect(text).toContain("urlset");
  });

  test("ana sayfa meta tagları doğru", async ({ page }) => {
    await page.goto("/");
    const description = await page.locator('meta[name="description"]').getAttribute("content");
    expect(description).toBeTruthy();
    expect(description!.length).toBeGreaterThan(50);

    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute("content");
    expect(ogTitle).toBeTruthy();
  });

  test("JSON-LD structured data mevcut", async ({ page }) => {
    await page.goto("/");
    const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(jsonLd).toBeTruthy();
    const parsed = JSON.parse(jsonLd!);
    expect(parsed["@context"]).toBe("https://schema.org");
  });
});

test.describe("Güvenlik Headers", () => {
  test("API güvenlik headerları mevcut", async ({ request }) => {
    const response = await request.get("/api/tenders?limit=1");
    const headers = response.headers();
    // Check cache-control
    expect(headers["cache-control"]).toBeDefined();
  });

  test("sayfa X-Frame-Options headerı", async ({ request }) => {
    const response = await request.get("/");
    const headers = response.headers();
    // CSP or X-Frame-Options should be present
    const hasSecurityHeader =
      headers["x-frame-options"] ||
      headers["content-security-policy"] ||
      headers["x-content-type-options"];
    expect(hasSecurityHeader).toBeTruthy();
  });
});
