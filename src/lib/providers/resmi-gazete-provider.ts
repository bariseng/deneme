// Resmi Gazete Provider — daily gazette scanning + KİK announcements
import { prisma } from "@/lib/prisma";
import { mevzuatLimiter } from "./rate-limiter";
import { ProviderCache } from "./cache";
import { classifyUpdate, generateAiSummary } from "@/lib/legal-scanner";

export interface GazetteEntry {
  readonly title: string;
  readonly url: string;
  readonly publishDate: Date;
  readonly content?: string;
  readonly category?: string;
}

const BASE_URL = "https://www.resmigazete.gov.tr";
const KIK_BASE_URL = "https://www.ihale.gov.tr";
const CACHE_TTL_SECONDS = 86_400; // 24h

const IHALE_KEYWORDS: readonly string[] = [
  "ihale",
  "4734",
  "4735",
  "kamu alım",
  "KİK",
  "teminat",
] as const;

const FETCH_HEADERS: HeadersInit = { Accept: "text/html", "User-Agent": "Mozilla/5.0 (compatible; IhalePro/1.0)" };
const FETCH_TIMEOUT_MS = 15_000;
const cache = new ProviderCache("resmi-gazete", CACHE_TTL_SECONDS);

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function detectCategory(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("kanun")) return "Kanun";
  if (t.includes("yönetmelik") || t.includes("yonetmelik")) return "Yönetmelik";
  if (t.includes("tebliğ") || t.includes("teblig")) return "Tebliğ";
  if (t.includes("karar")) return "Karar";
  return "Duyuru";
}

function containsIhaleKeyword(text: string): boolean {
  const lower = text.toLowerCase();
  return IHALE_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
}

function formatDateParts(date: Date) {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = String(date.getFullYear());
  return { month: m, year: y, compact: `${y}${m}${d}` };
}

function parseTurkishDate(dateStr: string): Date {
  const m = dateStr.match(/(\d{2})[./](\d{2})[./](\d{4})/);
  return m ? new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1])) : new Date();
}

function parseDailyGazetteHtml(html: string, date: Date): GazetteEntry[] {
  const entries: GazetteEntry[] = [];
  // Match all links, including those with ihale keywords in link text
  const linkPattern = /<a[^>]+href="([^"]+)"[^>]*>([^<]*(?:ihale|4734|4735|kamu alım|teminat)[^<]*)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = linkPattern.exec(html)) !== null) {
    const href = match[1];
    const title = stripHtml(match[2]);
    if (!title || title.length < 5) continue;

    const { month, year } = formatDateParts(date);
    const fullUrl = href.startsWith("http")
      ? href
      : `${BASE_URL}/eskiler/${year}/${month}/${href}`;

    entries.push({
      title,
      url: fullUrl,
      publishDate: date,
      content: undefined,
      category: detectCategory(title),
    });
  }

  // Also do a broad scan for links that might contain keywords
  const broadPattern = /<a[^>]*href="([^"]*\.htm)"[^>]*>([\s\S]*?)<\/a>/gi;
  while ((match = broadPattern.exec(html)) !== null) {
    const href = match[1];
    const title = stripHtml(match[2]);
    if (!title || title.length < 10) continue;
    if (/^(Ana Sayfa|İletişim|Arşiv|Hakkında)/i.test(title)) continue;
    if (!containsIhaleKeyword(title)) continue;

    const { month, year } = formatDateParts(date);
    const fullUrl = href.startsWith("http")
      ? href
      : `${BASE_URL}/eskiler/${year}/${month}/${href}`;

    // Avoid duplicates
    if (entries.some((e) => e.url === fullUrl)) continue;

    entries.push({
      title,
      url: fullUrl,
      publishDate: date,
      content: undefined,
      category: detectCategory(title),
    });
  }

  return entries;
}

function parseKikAnnouncementsHtml(html: string): GazetteEntry[] {
  const entries: GazetteEntry[] = [];

  const rows =
    html.match(
      /<div[^>]*class="[^"]*duyuru[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    ) ||
    html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) ||
    [];

  for (const row of rows.slice(0, 20)) {
    const linkMatch = row.match(
      /<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i,
    );
    if (!linkMatch) continue;

    const title = stripHtml(linkMatch[2]);
    if (!title || title.length < 5) continue;

    const href = linkMatch[1];
    const dateMatch = row.match(/(\d{2})[./](\d{2})[./](\d{4})/);
    const pubDate = dateMatch ? parseTurkishDate(dateMatch[0]) : new Date();

    entries.push({
      title,
      url: href.startsWith("http") ? href : `${KIK_BASE_URL}${href}`,
      publishDate: pubDate,
      content: undefined,
      category: detectCategory(title),
    });
  }

  return entries;
}

async function fetchGazetteArchivePage(date: Date): Promise<GazetteEntry[]> {
  const { month, year, compact } = formatDateParts(date);
  const url = `${BASE_URL}/eskiler/${year}/${month}/${compact}.htm`;

  try {
    const res = await fetch(url, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!res.ok) return [];

    // Resmi Gazete uses windows-1254 (Turkish) encoding
    const buffer = await res.arrayBuffer();
    const html = new TextDecoder("windows-1254").decode(buffer);
    return parseDailyGazetteHtml(html, date);
  } catch (err) {
    console.error(
      "[resmi-gazete] archive page fetch error:",
      err instanceof Error ? err.message : String(err),
    );
    return [];
  }
}

async function fetchGazetteMainPage(): Promise<GazetteEntry[]> {
  try {
    const res = await fetch(`${BASE_URL}/default.aspx`, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!res.ok) return [];

    const html = await res.text();
    const entries: GazetteEntry[] = [];

    const linkPattern =
      /<a[^>]*href="([^"]*eskiler[^"]*\.htm)"[^>]*>([\s\S]*?)<\/a>/gi;
    let match: RegExpExecArray | null;

    while ((match = linkPattern.exec(html)) !== null) {
      const href = match[1];
      const title = stripHtml(match[2]);
      if (!title || title.length < 5) continue;
      if (!containsIhaleKeyword(title)) continue;

      entries.push({
        title,
        url: href.startsWith("http") ? href : `${BASE_URL}${href}`,
        publishDate: new Date(),
        content: undefined,
        category: detectCategory(title),
      });
    }

    return entries;
  } catch (err) {
    console.error(
      "[resmi-gazete] main page fetch error:",
      err instanceof Error ? err.message : String(err),
    );
    return [];
  }
}

async function fetchEntryContent(entryUrl: string): Promise<string | null> {
  await mevzuatLimiter.acquire();

  try {
    const res = await fetch(entryUrl, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!res.ok) return null;

    // Resmi Gazete sub-pages also use windows-1254
    const buffer = await res.arrayBuffer();
    const html = new TextDecoder("windows-1254").decode(buffer);
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    return bodyMatch ? htmlToText(bodyMatch[1]).substring(0, 30_000) : null;
  } catch {
    return null;
  }
}

async function fetchKikAnnouncementsPage(): Promise<GazetteEntry[]> {
  try {
    const res = await fetch(`${KIK_BASE_URL}/Duyurular.html`, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!res.ok) return [];

    const html = await res.text();
    return parseKikAnnouncementsHtml(html);
  } catch (err) {
    console.error(
      "[resmi-gazete] KİK announcements fetch error:",
      err instanceof Error ? err.message : String(err),
    );
    return [];
  }
}

async function saveEntryAsLegalUpdate(
  entry: GazetteEntry, source: "RESMI_GAZETE" | "KIK", withAiSummary: boolean,
): Promise<boolean> {
  const exists = await prisma.legalUpdate.findFirst({ where: { originalUrl: entry.url } });
  if (exists) return false;
  let fullContent = entry.content;
  if (!fullContent && entry.url) fullContent = (await fetchEntryContent(entry.url)) ?? undefined;
  const text = fullContent || entry.title;
  const { category, impactLevel } = classifyUpdate(entry.title, text);
  const summary = text.substring(0, 300) + (text.length > 300 ? "..." : "");
  await prisma.legalUpdate.create({
    data: {
      title: entry.title, source, category, summary, impactLevel,
      aiSummary: withAiSummary ? generateAiSummary(entry.title, text) : null,
      originalUrl: entry.url, publishDate: entry.publishDate, rawContent: fullContent || null,
    },
  });
  return true;
}

interface ResmiGazeteProviderAPI {
  fetchDailyGazette(dateStr?: string): Promise<GazetteEntry[]>;
  syncKikAnnouncements(): Promise<number>;
  syncKikDecisions(): Promise<number>;
  syncDailyGazette(dateStr?: string): Promise<number>;
}

function createResmiGazeteProvider(): ResmiGazeteProviderAPI {
  return {
    async fetchDailyGazette(dateStr?: string): Promise<GazetteEntry[]> {
      await mevzuatLimiter.acquire();

      const date = dateStr ? new Date(dateStr) : new Date();
      const cacheKey = `gazette-${date.toISOString().slice(0, 10)}`;

      try {
        return await cache.swr(cacheKey, async () => {
          // Try archive page first
          const archiveEntries = await fetchGazetteArchivePage(date);
          if (archiveEntries.length > 0) return archiveEntries;

          // Fall back to main page for today
          if (!dateStr) {
            return fetchGazetteMainPage();
          }

          return [];
        });
      } catch (err) {
        console.error(
          "[resmi-gazete] fetchDailyGazette error:",
          err instanceof Error ? err.message : String(err),
        );
        return [];
      }
    },

    async syncKikAnnouncements(): Promise<number> {
      await mevzuatLimiter.acquire();
      try {
        const cacheKey = `kik-announcements-${new Date().toISOString().slice(0, 10)}`;
        const entries = await cache.swr(cacheKey, fetchKikAnnouncementsPage);
        let count = 0;
        for (const entry of entries) {
          if (await saveEntryAsLegalUpdate(entry, "KIK", false)) count++;
        }
        return count;
      } catch (err) {
        console.error("[resmi-gazete] syncKikAnnouncements error:", err instanceof Error ? err.message : String(err));
        return 0;
      }
    },

    async syncKikDecisions(): Promise<number> {
      await mevzuatLimiter.acquire();
      try {
        const res = await fetch(`${KIK_BASE_URL}/KurulKararlari`, {
          headers: FETCH_HEADERS, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        if (!res.ok) return 0;
        const html = await res.text();
        const rows = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
        let count = 0;
        for (const row of rows.slice(0, 20)) {
          const linkMatch = row.match(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
          if (!linkMatch) continue;
          const title = stripHtml(linkMatch[2]);
          if (!title || title.length < 5) continue;
          const href = linkMatch[1];
          const url = href.startsWith("http") ? href : `${KIK_BASE_URL}${href}`;
          const exists = await prisma.legalUpdate.findFirst({ where: { originalUrl: url } });
          if (exists) continue;
          const dateMatch = row.match(/(\d{2})[./](\d{2})[./](\d{4})/);
          const pubDate = dateMatch ? parseTurkishDate(dateMatch[0]) : new Date();
          await prisma.legalUpdate.create({
            data: {
              title: `KİK Kurul Kararı: ${title}`, source: "KIK", category: "DUYURU",
              summary: title.substring(0, 300), impactLevel: "MEDIUM",
              originalUrl: url, publishDate: pubDate, rawContent: title,
            },
          });
          count++;
        }
        return count;
      } catch (err) {
        console.error("[resmi-gazete] syncKikDecisions error:", err instanceof Error ? err.message : String(err));
        return 0;
      }
    },

    async syncDailyGazette(dateStr?: string): Promise<number> {
      try {
        const entries = await this.fetchDailyGazette(dateStr);
        let count = 0;
        for (const entry of entries) {
          if (await saveEntryAsLegalUpdate(entry, "RESMI_GAZETE", true)) count++;
        }
        return count;
      } catch (err) {
        console.error("[resmi-gazete] syncDailyGazette error:", err instanceof Error ? err.message : String(err));
        return 0;
      }
    },
  };
}

const g = globalThis as unknown as { _resmiGazeteProvider?: ResmiGazeteProviderAPI };

export const resmiGazeteProvider =
  g._resmiGazeteProvider ??
  (g._resmiGazeteProvider = createResmiGazeteProvider());
