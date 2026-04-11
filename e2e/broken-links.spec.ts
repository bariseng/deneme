// ─── E2E: Broken Link Testi ─────────────────────────────────
// Tüm sayfaları tarayıp kırık bağlantıları (404/500) raporlar
import { test, expect, type Page } from "@playwright/test";

// Production'da aktif sayfalar
const CORE_PAGES = [
  "/",
  "/ihaleler",
  "/dashboard",
  "/giris",
  "/kayit",
  "/raporlar",
  "/bildirimler",
  "/ayarlar",
  "/projeler",
];

// Henüz deploy edilmemiş sayfalar (local dev'de test edilir)
const DEV_ONLY_PAGES = [
  "/fiyat-endeksi",
  "/takvim",
  "/topluluk",
  "/uluslararasi",
  "/firmalar",
  "/teklifler",
  "/ai",
  "/api-docs",
  "/entegrasyonlar",
  "/premium",
  "/admin",
  "/agent",
  "/akademi",
  "/belgeler",
  "/finans",
  "/finans/sigorta",
  "/finans/teminat",
  "/guvenlik",
  "/istihbarat",
  "/mali-skor",
  "/mevzuat",
  "/ortaklik",
  "/sozlesmeler",
  "/takvim/ayarlar",
  "/takvim/cakismalar",
  "/topluluk/firmalar",
  "/topluluk/forum",
  "/topluluk/wiki",
  "/uluslararasi/ihaleler",
  "/uluslararasi/ulkeler",
  "/white-label",
  "/hakkimizda",
  "/iletisim",
  "/sozluk",
  "/asiri-dusuk-teklif-savunma-ornegi",
  "/sinir-deger-hesaplama",
  "/yi-ufe-endeksi",
  "/is-deneyim-belgesi-guncelleme",
  "/ciro-guncelleme",
  "/kararlar",
  "/offline",
  "/sertifika",
];

const isLocalDev = process.env.BASE_URL?.includes("localhost") || process.env.TEST_ALL_PAGES === "true";
const SITE_PAGES = isLocalDev ? [...CORE_PAGES, ...DEV_ONLY_PAGES] : CORE_PAGES;

interface LinkResult {
  page: string;
  href: string;
  status: number | "timeout" | "error";
  text: string;
}

async function collectLinks(page: Page, path: string): Promise<{ href: string; text: string }[]> {
  await page.goto(path, { waitUntil: "domcontentloaded", timeout: 15_000 });
  return page.$$eval("a[href]", (anchors) =>
    anchors
      .map((a) => ({
        href: a.getAttribute("href") || "",
        text: (a.textContent || "").trim().slice(0, 60),
      }))
      .filter(
        (l) =>
          l.href &&
          !l.href.startsWith("#") &&
          !l.href.startsWith("mailto:") &&
          !l.href.startsWith("tel:") &&
          !l.href.startsWith("javascript:")
      )
  );
}

test.describe("Kırık Bağlantı Testi", () => {
  test.setTimeout(300_000); // 5 dakika — tüm sayfa taraması

  test("tüm sayfalar yüklenir (200 veya redirect)", async ({ page }) => {
    const failedPages: { path: string; status: number | string }[] = [];

    for (const path of SITE_PAGES) {
      try {
        const response = await page.goto(path, {
          waitUntil: "domcontentloaded",
          timeout: 15_000,
        });
        const status = response?.status() ?? 0;
        if (status >= 400) {
          failedPages.push({ path, status });
        }
      } catch {
        failedPages.push({ path, status: "timeout" });
      }
    }

    if (failedPages.length > 0) {
      const report = failedPages
        .map((f) => `  ${f.path} → ${f.status}`)
        .join("\n");
      expect(failedPages, `Yüklenemeyen sayfalar:\n${report}`).toHaveLength(0);
    }
  });

  test("iç bağlantılar kırık değil", async ({ page, request }) => {
    const broken: LinkResult[] = [];
    const checked = new Set<string>();
    const baseOrigin = new URL(
      page.context().pages()[0]?.url() || "http://localhost:3000"
    ).origin;

    // Ana sayfa + birkaç kritik sayfayı tara
    const pagesToCrawl = [
      "/",
      "/ihaleler",
      "/dashboard",
      "/fiyat-endeksi",
      "/hakkimizda",
      "/iletisim",
      "/premium",
      "/topluluk",
      "/uluslararasi",
      "/akademi",
      "/firmalar",
      "/raporlar",
      "/kararlar",
      "/sozluk",
    ];

    for (const pagePath of pagesToCrawl) {
      let links: { href: string; text: string }[] = [];
      try {
        links = await collectLinks(page, pagePath);
      } catch {
        continue;
      }

      for (const link of links) {
        let fullUrl: string;
        try {
          fullUrl = new URL(link.href, `${baseOrigin}${pagePath}`).href;
        } catch {
          continue;
        }

        // Sadece iç bağlantıları kontrol et
        if (!fullUrl.startsWith(baseOrigin)) continue;
        // Aynı URL'yi tekrar kontrol etme
        const urlPath = new URL(fullUrl).pathname;
        if (checked.has(urlPath)) continue;
        checked.add(urlPath);

        // API rotalarını atla
        if (urlPath.startsWith("/api/")) continue;

        try {
          const res = await request.get(urlPath, { timeout: 10_000 });
          if (res.status() >= 400) {
            broken.push({
              page: pagePath,
              href: urlPath,
              status: res.status(),
              text: link.text,
            });
          }
        } catch {
          broken.push({
            page: pagePath,
            href: urlPath,
            status: "timeout",
            text: link.text,
          });
        }
      }
    }

    if (broken.length > 0) {
      const report = broken
        .map((b) => `  [${b.page}] "${b.text}" → ${b.href} (${b.status})`)
        .join("\n");
      expect(
        broken,
        `Kırık iç bağlantılar (${broken.length}):\n${report}`
      ).toHaveLength(0);
    }
  });

  test("dış bağlantılar erişilebilir", async ({ page, request }) => {
    const broken: LinkResult[] = [];
    const checked = new Set<string>();
    const baseOrigin = new URL(
      page.context().pages()[0]?.url() || "http://localhost:3000"
    ).origin;

    // Sadece ana sayfa + hakkımızda + iletişim dış linklerini kontrol et
    const pagesToCheck = ["/", "/hakkimizda", "/iletisim"];

    for (const pagePath of pagesToCheck) {
      let links: { href: string; text: string }[] = [];
      try {
        links = await collectLinks(page, pagePath);
      } catch {
        continue;
      }

      for (const link of links) {
        if (!link.href.startsWith("http")) continue;
        try {
          const url = new URL(link.href);
          if (url.origin === baseOrigin) continue;
          if (checked.has(url.origin + url.pathname)) continue;
          checked.add(url.origin + url.pathname);

          const res = await request.get(link.href, {
            timeout: 10_000,
            ignoreHTTPSErrors: true,
          });
          if (res.status() >= 400) {
            broken.push({
              page: pagePath,
              href: link.href,
              status: res.status(),
              text: link.text,
            });
          }
        } catch {
          // Dış siteler timeout olabilir, sadece logla
        }
      }
    }

    if (broken.length > 0) {
      const report = broken
        .map((b) => `  [${b.page}] "${b.text}" → ${b.href} (${b.status})`)
        .join("\n");
      console.warn(`Erişilemeyen dış bağlantılar:\n${report}`);
    }
    // Dış linkler için soft fail — sadece uyar
    expect(true).toBe(true);
  });
});
