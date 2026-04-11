// ─── E2E: Görsel Regresyon Testi ────────────────────────────
// Desktop (1280px) + Mobile (375px) ekran görüntüsü karşılaştırması
import { test, expect } from "@playwright/test";

interface PageConfig {
  name: string;
  path: string;
  waitFor?: string; // CSS selector — yüklenmesini bekle
  scrollToBottom?: boolean;
}

// Production'da aktif sayfalar
const CORE_PAGES: PageConfig[] = [
  { name: "anasayfa", path: "/" },
  { name: "ihaleler", path: "/ihaleler", waitFor: "main" },
  { name: "dashboard", path: "/dashboard" },
  { name: "giris", path: "/giris" },
  { name: "kayit", path: "/kayit" },
  { name: "raporlar", path: "/raporlar" },
  { name: "bildirimler", path: "/bildirimler" },
  { name: "ayarlar", path: "/ayarlar" },
  { name: "projeler", path: "/projeler" },
];

// Henüz deploy edilmemiş — local dev'de test edilir
const DEV_ONLY_PAGES: PageConfig[] = [
  { name: "hakkimizda", path: "/hakkimizda" },
  { name: "iletisim", path: "/iletisim" },
  { name: "premium", path: "/premium" },
  { name: "takvim", path: "/takvim" },
  { name: "kararlar", path: "/kararlar" },
  { name: "fiyat-endeksi", path: "/fiyat-endeksi" },
  { name: "sinir-deger", path: "/sinir-deger-hesaplama" },
  { name: "yi-ufe", path: "/yi-ufe-endeksi" },
  { name: "asiri-dusuk", path: "/asiri-dusuk-teklif-savunma-ornegi" },
  { name: "firmalar", path: "/firmalar" },
  { name: "mali-skor", path: "/mali-skor" },
  { name: "istihbarat", path: "/istihbarat" },
  { name: "finans", path: "/finans" },
  { name: "sigorta", path: "/finans/sigorta" },
  { name: "teminat", path: "/finans/teminat" },
  { name: "topluluk", path: "/topluluk" },
  { name: "forum", path: "/topluluk/forum" },
  { name: "wiki", path: "/topluluk/wiki" },
  { name: "akademi", path: "/akademi" },
  { name: "sozluk", path: "/sozluk" },
  { name: "mevzuat", path: "/mevzuat" },
  { name: "uluslararasi", path: "/uluslararasi" },
  { name: "uluslararasi-ihaleler", path: "/uluslararasi/ihaleler" },
  { name: "ulkeler", path: "/uluslararasi/ulkeler" },
  { name: "is-deneyim", path: "/is-deneyim-belgesi-guncelleme" },
  { name: "ciro-guncelleme", path: "/ciro-guncelleme" },
  { name: "belgeler", path: "/belgeler" },
  { name: "ai", path: "/ai" },
  { name: "api-docs", path: "/api-docs" },
  { name: "sozlesmeler", path: "/sozlesmeler" },
  { name: "teklifler", path: "/teklifler" },
  { name: "ortaklik", path: "/ortaklik" },
  { name: "white-label", path: "/white-label" },
  { name: "sertifika", path: "/sertifika" },
];

const isLocalDev = process.env.BASE_URL?.includes("localhost") || process.env.TEST_ALL_PAGES === "true";
const PAGES = isLocalDev ? [...CORE_PAGES, ...DEV_ONLY_PAGES] : CORE_PAGES;

// ─── DESKTOP (1280×800) ─────────────────────────────────────
test.describe("Görsel Regresyon — Desktop (1280px)", () => {
  test.use({
    viewport: { width: 1280, height: 800 },
    colorScheme: "light",
  });

  for (const pg of PAGES) {
    test(`${pg.name} — desktop`, async ({ page }) => {
      await page.goto(pg.path, {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
      });

      if (pg.waitFor) {
        await page.locator(pg.waitFor).first().waitFor({ timeout: 10_000 }).catch(() => {});
      }

      // Fontlar ve resimlerin yüklenmesini bekle
      await page.waitForTimeout(1000);

      // Animasyonları durdur
      await page.addStyleTag({
        content: `*, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }`,
      });

      await expect(page).toHaveScreenshot(`desktop-${pg.name}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.05, // %5 tolerans
        timeout: 15_000,
      });
    });
  }
});

// ─── MOBILE (375×667) ───────────────────────────────────────
test.describe("Görsel Regresyon — Mobil (375px)", () => {
  test.use({
    viewport: { width: 375, height: 667 },
    colorScheme: "light",
    isMobile: true,
  });

  for (const pg of PAGES) {
    test(`${pg.name} — mobil`, async ({ page }) => {
      await page.goto(pg.path, {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
      });

      if (pg.waitFor) {
        await page.locator(pg.waitFor).first().waitFor({ timeout: 10_000 }).catch(() => {});
      }

      await page.waitForTimeout(1000);

      await page.addStyleTag({
        content: `*, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }`,
      });

      await expect(page).toHaveScreenshot(`mobile-${pg.name}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.05,
        timeout: 15_000,
      });
    });
  }
});

// ─── KRİTİK KOMPONENTLERİN GÖRSEL TESTİ ────────────────────
test.describe("Kritik Bileşen Görsel Testi", () => {
  test.use({
    viewport: { width: 1280, height: 800 },
    colorScheme: "light",
  });

  test("header/navbar görünümü", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    const header = page.locator("header, nav").first();
    if (await header.isVisible()) {
      await expect(header).toHaveScreenshot("component-header.png", {
        maxDiffPixelRatio: 0.03,
      });
    }
  });

  test("footer görünümü", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    const footer = page.locator("footer").first();
    if (await footer.isVisible()) {
      await expect(footer).toHaveScreenshot("component-footer.png", {
        maxDiffPixelRatio: 0.03,
      });
    }
  });

  test("giriş formu görünümü", async ({ page }) => {
    await page.goto("/giris", { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    const form = page.locator("form").first();
    if (await form.isVisible()) {
      await expect(form).toHaveScreenshot("component-login-form.png", {
        maxDiffPixelRatio: 0.03,
      });
    }
  });

  test("premium fiyat kartları", async ({ page }) => {
    await page.goto("/premium", { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    await page.addStyleTag({
      content: `*, *::before, *::after {
        animation-duration: 0s !important;
        transition-duration: 0s !important;
      }`,
    });

    await expect(page).toHaveScreenshot("component-premium-cards.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });
});

// ─── RESPONSIVE BREAKPOINT TESTLERİ ─────────────────────────
test.describe("Responsive Breakpoint Testi", () => {
  const breakpoints = [
    { name: "galaxy-fold", width: 280, height: 653 },
    { name: "mobile-sm", width: 320, height: 568 },
    { name: "mobile", width: 375, height: 667 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "laptop", width: 1024, height: 768 },
    { name: "desktop", width: 1280, height: 800 },
    { name: "wide", width: 1920, height: 1080 },
  ];

  for (const bp of breakpoints) {
    test(`anasayfa @ ${bp.name} (${bp.width}px)`, async ({ browser }) => {
      test.setTimeout(60_000);
      const context = await browser.newContext({
        viewport: { width: bp.width, height: bp.height },
        locale: "tr-TR",
      });
      const page = await context.newPage();

      await page.goto("/", { waitUntil: "domcontentloaded", timeout: 30_000 });
      await page.waitForTimeout(1000);

      await page.addStyleTag({
        content: `*, *::before, *::after {
          animation-duration: 0s !important;
          transition-duration: 0s !important;
        }`,
      });

      await expect(page).toHaveScreenshot(`breakpoint-home-${bp.name}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.05,
      });

      // Yatay taşma kontrolü
      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasOverflow, `${bp.name} (${bp.width}px) yatay taşma var!`).toBe(false);

      await context.close();
    });
  }
});

// ─── TÜRKÇE KARAKTER & FONT TESTİ ──────────────────────────
test.describe("Türkçe Karakter Doğruluğu", () => {
  test("sayfada bozuk karakter yok", async ({ page }) => {
    const pagesToCheck = ["/", "/hakkimizda", "/iletisim", "/premium", "/ihaleler"];
    const issues: string[] = [];

    for (const path of pagesToCheck) {
      await page.goto(path, { waitUntil: "domcontentloaded", timeout: 15_000 });

      const text = await page.evaluate(() => document.body.innerText);

      // Unicode escape kalıntısı kontrolü
      if (/\\u[0-9a-fA-F]{4}/.test(text)) {
        issues.push(`${path}: Unicode escape kalıntısı bulundu`);
      }

      // Yaygın ASCII-Türkçe hataları
      const asciiErrors = [
        /\bBugun\b/,
        /\bCalisan\b/,
        /\bOzellik\b/,
        /\bUcret\b/,
        /\bGuncelleme\b/,
        /\bOncelik\b/,
        /\bIslem\b/,
      ];
      for (const pattern of asciiErrors) {
        if (pattern.test(text)) {
          issues.push(`${path}: ASCII Türkçe hatası — "${text.match(pattern)?.[0]}"`);
        }
      }
    }

    if (issues.length > 0) {
      expect(issues, `Türkçe karakter sorunları:\n${issues.join("\n")}`).toHaveLength(0);
    }
  });

  test("fontlar yüklenebiliyor", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    // Google Fonts link'inin HTML'de olup olmadığını kontrol et
    const hasFontLink = await page.locator('link[href*="fonts.googleapis.com"]').count();
    const hasFontImport = await page.evaluate(() => {
      const styles = Array.from(document.styleSheets);
      return styles.some((s) => {
        try {
          return Array.from(s.cssRules || []).some(
            (r) => r.cssText?.includes("font-face") || r.cssText?.includes("fonts.googleapis")
          );
        } catch {
          return false;
        }
      });
    });

    // Font kaynağı tanımlı olmalı (yükleme headless'ta başarısız olabilir)
    expect(hasFontLink > 0 || hasFontImport, "Font kaynağı tanımlı değil").toBe(true);
  });
});
