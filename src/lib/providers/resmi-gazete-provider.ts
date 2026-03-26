// ─── Resmi Gazete (Official Gazette) Provider ───────────────
// Monitors daily publications from resmigazete.gov.tr
// Detects procurement-related legal changes

import { prisma } from "@/lib/prisma";
import { BaseProvider } from "./index";
import type { HealthCheckResult, ProviderConfig } from "./types";
import {
  classifyUpdate,
  generateAiSummary,
  generateDiff,
} from "@/lib/legal-scanner";

// ─── Types ──────────────────────────────────────────────────

export interface GazetteEntry {
  title: string;
  category: string;
  url: string;
  publishDate: Date;
  content: string;
  rgNumber?: string;
}

// ─── Procurement keywords for filtering ─────────────────────

const PROCUREMENT_KEYWORDS = [
  "ihale", "4734", "4735", "kamu alım",
  "teklif", "şartname", "yaklaşık maliyet",
  "yapım işi", "hizmet alımı", "mal alımı",
  "danışmanlık", "eşik değer", "parasal limit",
  "iş deneyim", "bilanço", "ciro",
  "geçici teminat", "kesin teminat",
  "ihalelere yönelik başvuru",
  "kamu ihale kurumu", "kik",
  "elektronik ihale", "ekap",
  "fiyat farkı", "süre uzatımı",
  "sözleşme", "yüklenici",
];

// ─── Provider ───────────────────────────────────────────────

class ResmiGazeteProvider extends BaseProvider<GazetteEntry> {
  private readonly baseUrl: string;

  constructor() {
    const config: ProviderConfig = {
      name: "RESMI_GAZETE",
      baseUrl: "https://www.resmigazete.gov.tr",
      rateLimitMs: 2000,
      maxTokens: 2,
      cache: { ttl: 3600, staleWhileRevalidate: true, key: "resmi-gazete" },
      maxRetries: 3,
      baseDelayMs: 1000,
      circuitBreakerThreshold: 5,
      circuitBreakerResetMs: 60_000,
    };
    super(config);
    this.baseUrl = config.baseUrl;
  }

  protected async doFetch(params: Record<string, unknown>): Promise<GazetteEntry[]> {
    const date = params.date as string | undefined;
    return this.fetchDailyGazette(date);
  }

  protected async doFetchById(id: string): Promise<GazetteEntry | null> {
    return this.fetchGazetteEntry(id);
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const res = await fetch(this.baseUrl, { method: "HEAD", signal: AbortSignal.timeout(5000) });
      return { ok: res.ok, latencyMs: Date.now() - start };
    } catch {
      return { ok: false, latencyMs: Date.now() - start };
    }
  }

  // ─── Fetch daily gazette ────────────────────────────────

  async fetchDailyGazette(dateStr?: string): Promise<GazetteEntry[]> {
    await this.rateLimiter.acquire();

    const date = dateStr ? new Date(dateStr) : new Date();
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    try {
      // Resmi Gazete daily archive page
      const url = `${this.baseUrl}/eskiler/${year}/${month}/${year}${month}${day}.htm`;
      const res = await fetch(url, {
        headers: { "User-Agent": "IhalePro/1.0 Legal Scanner" },
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        // Try main page for today
        if (!dateStr) {
          return this.fetchTodayFromMainPage();
        }
        return [];
      }

      const html = await res.text();
      return this.parseDailyGazette(html, date, url);
    } catch {
      return [];
    }
  }

  // ─── Fetch specific entry ───────────────────────────────

  async fetchGazetteEntry(entryUrl: string): Promise<GazetteEntry | null> {
    await this.rateLimiter.acquire();

    try {
      const fullUrl = entryUrl.startsWith("http") ? entryUrl : `${this.baseUrl}${entryUrl}`;
      const res = await fetch(fullUrl, {
        headers: { "User-Agent": "IhalePro/1.0 Legal Scanner" },
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) return null;

      const html = await res.text();
      const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
      const title = titleMatch ? this.stripHtml(titleMatch[1]).trim() : "Resmi Gazete";

      const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      const content = bodyMatch ? this.htmlToText(bodyMatch[1]) : "";

      return {
        title,
        category: this.detectCategory(title),
        url: fullUrl,
        publishDate: new Date(),
        content: content.substring(0, 30000),
      };
    } catch {
      return null;
    }
  }

  // ─── Fetch today from main page ─────────────────────────

  private async fetchTodayFromMainPage(): Promise<GazetteEntry[]> {
    try {
      const res = await fetch(this.baseUrl, {
        headers: { "User-Agent": "IhalePro/1.0 Legal Scanner" },
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) return [];

      const html = await res.text();
      const entries: GazetteEntry[] = [];

      // Parse links from main page
      const linkPattern = /<a[^>]*href="([^"]*eskiler[^"]*\.htm)"[^>]*>([\s\S]*?)<\/a>/gi;
      let match;

      while ((match = linkPattern.exec(html)) !== null) {
        const href = match[1];
        const title = this.stripHtml(match[2]).trim();
        if (!title || title.length < 5) continue;

        entries.push({
          title,
          category: this.detectCategory(title),
          url: href.startsWith("http") ? href : `${this.baseUrl}${href}`,
          publishDate: new Date(),
          content: "",
        });
      }

      return entries;
    } catch {
      return [];
    }
  }

  // ─── Sync: scan gazette and save procurement-related ────

  async syncDailyGazette(dateStr?: string): Promise<number> {
    const result = await this.logSync("sync-daily-gazette", async () => {
      const entries = await this.fetchDailyGazette(dateStr);
      const procurementEntries = entries.filter((e) => this.isProcurementRelated(e));
      let count = 0;

      for (const entry of procurementEntries) {
        // Check duplicate
        const exists = await prisma.legalUpdate.findFirst({
          where: { originalUrl: entry.url },
        });
        if (exists) continue;

        // Fetch full content if not already fetched
        let fullContent = entry.content;
        if (!fullContent && entry.url) {
          const full = await this.fetchGazetteEntry(entry.url);
          fullContent = full?.content || "";
        }

        const { category, impactLevel } = classifyUpdate(entry.title, fullContent || entry.title);
        const aiSummary = generateAiSummary(entry.title, fullContent || entry.title);
        const summary = (fullContent || entry.title).substring(0, 300);

        await prisma.legalUpdate.create({
          data: {
            title: entry.title,
            source: "RESMI_GAZETE",
            category,
            summary: summary + (summary.length >= 300 ? "..." : ""),
            aiSummary,
            impactLevel,
            originalUrl: entry.url,
            publishDate: entry.publishDate,
            rawContent: fullContent || null,
          },
        });

        count++;
      }

      return count;
    });

    return result.recordCount;
  }

  // ─── Sync KİK announcements ────────────────────────────

  async syncKikAnnouncements(): Promise<number> {
    const result = await this.logSync("sync-kik-announcements", async () => {
      await this.rateLimiter.acquire();
      let count = 0;

      try {
        // KİK duyuru sayfası
        const res = await fetch("https://www.ihale.gov.tr/Duyurular", {
          headers: { "User-Agent": "IhalePro/1.0 Legal Scanner" },
          signal: AbortSignal.timeout(15000),
        });

        if (!res.ok) return 0;

        const html = await res.text();
        const entries = this.parseKikPage(html);

        for (const entry of entries) {
          const exists = await prisma.legalUpdate.findFirst({
            where: { originalUrl: entry.url },
          });
          if (exists) continue;

          const { category, impactLevel } = classifyUpdate(entry.title, entry.content || entry.title);
          const summary = (entry.content || entry.title).substring(0, 300);

          await prisma.legalUpdate.create({
            data: {
              title: entry.title,
              source: "KIK",
              category,
              summary: summary + (summary.length >= 300 ? "..." : ""),
              impactLevel,
              originalUrl: entry.url,
              publishDate: entry.publishDate,
              rawContent: entry.content || null,
            },
          });

          count++;
        }
      } catch {
        // KİK unavailable, skip
      }

      return count;
    });

    return result.recordCount;
  }

  // ─── KIK Kurul Kararları ────────────────────────────────

  async syncKikDecisions(): Promise<number> {
    const result = await this.logSync("sync-kik-decisions", async () => {
      await this.rateLimiter.acquire();
      let count = 0;

      try {
        const res = await fetch("https://www.ihale.gov.tr/KurulKararlari", {
          headers: { "User-Agent": "IhalePro/1.0 Legal Scanner" },
          signal: AbortSignal.timeout(15000),
        });

        if (!res.ok) return 0;

        const html = await res.text();
        const decisions = this.parseKikDecisions(html);

        for (const decision of decisions.slice(0, 20)) {
          const exists = await prisma.legalUpdate.findFirst({
            where: { originalUrl: decision.url },
          });
          if (exists) continue;

          await prisma.legalUpdate.create({
            data: {
              title: decision.title,
              source: "KIK",
              category: "DUYURU",
              summary: decision.content.substring(0, 300),
              impactLevel: "MEDIUM",
              originalUrl: decision.url,
              publishDate: decision.publishDate,
              rawContent: decision.content || null,
            },
          });

          count++;
        }
      } catch {
        // KİK unavailable
      }

      return count;
    });

    return result.recordCount;
  }

  // ─── Parsing Helpers ────────────────────────────────────

  private parseDailyGazette(html: string, date: Date, _pageUrl: string): GazetteEntry[] {
    const entries: GazetteEntry[] = [];
    const linkPattern = /<a[^>]*href="([^"]*\.htm)"[^>]*>([\s\S]*?)<\/a>/gi;
    let match;

    while ((match = linkPattern.exec(html)) !== null) {
      const href = match[1];
      const title = this.stripHtml(match[2]).trim();
      if (!title || title.length < 10) continue;
      // Skip navigation links
      if (title.match(/^(Ana Sayfa|İletişim|Arşiv|Hakkında)/i)) continue;

      entries.push({
        title,
        category: this.detectCategory(title),
        url: href.startsWith("http") ? href : `${this.baseUrl}/eskiler/${href}`,
        publishDate: date,
        content: "",
      });
    }

    return entries;
  }

  private parseKikPage(html: string): GazetteEntry[] {
    const entries: GazetteEntry[] = [];
    const rows = html.match(/<div[^>]*class="[^"]*duyuru[^"]*"[^>]*>([\s\S]*?)<\/div>/gi)
      || html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)
      || [];

    for (const row of rows.slice(0, 20)) {
      const linkMatch = row.match(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
      if (!linkMatch) continue;

      const title = this.stripHtml(linkMatch[2]).trim();
      if (!title || title.length < 5) continue;

      const href = linkMatch[1];
      const dateMatch = row.match(/(\d{2})[./](\d{2})[./](\d{4})/);
      const pubDate = dateMatch
        ? new Date(parseInt(dateMatch[3]), parseInt(dateMatch[2]) - 1, parseInt(dateMatch[1]))
        : new Date();

      entries.push({
        title,
        category: this.detectCategory(title),
        url: href.startsWith("http") ? href : `https://www.ihale.gov.tr${href}`,
        publishDate: pubDate,
        content: "",
      });
    }

    return entries;
  }

  private parseKikDecisions(html: string): GazetteEntry[] {
    const entries: GazetteEntry[] = [];
    const rows = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];

    for (const row of rows.slice(0, 30)) {
      const linkMatch = row.match(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
      if (!linkMatch) continue;

      const title = this.stripHtml(linkMatch[2]).trim();
      if (!title || title.length < 5) continue;

      const href = linkMatch[1];
      const dateMatch = row.match(/(\d{2})[./](\d{2})[./](\d{4})/);
      const pubDate = dateMatch
        ? new Date(parseInt(dateMatch[3]), parseInt(dateMatch[2]) - 1, parseInt(dateMatch[1]))
        : new Date();

      entries.push({
        title: `KİK Kurul Kararı: ${title}`,
        category: "DUYURU",
        url: href.startsWith("http") ? href : `https://www.ihale.gov.tr${href}`,
        publishDate: pubDate,
        content: title,
      });
    }

    return entries;
  }

  // ─── Utilities ──────────────────────────────────────────

  private isProcurementRelated(entry: GazetteEntry): boolean {
    const text = `${entry.title} ${entry.content}`.toLowerCase();
    return PROCUREMENT_KEYWORDS.some((kw) => text.includes(kw));
  }

  private detectCategory(title: string): string {
    const t = title.toLowerCase();
    if (t.includes("kanun")) return "Kanun";
    if (t.includes("yönetmelik") || t.includes("yonetmelik")) return "Yönetmelik";
    if (t.includes("tebliğ") || t.includes("teblig")) return "Tebliğ";
    if (t.includes("karar")) return "Karar";
    return "Duyuru";
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  }

  private htmlToText(html: string): string {
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
}

// ─── Singleton ──────────────────────────────────────────────

const g = globalThis as unknown as { _resmiGazeteProvider?: ResmiGazeteProvider };
export const resmiGazeteProvider = g._resmiGazeteProvider ?? (g._resmiGazeteProvider = new ResmiGazeteProvider());
