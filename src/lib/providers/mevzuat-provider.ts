// ─── Mevzuat.gov.tr Provider ────────────────────────────────
// Fetches law/regulation texts from mevzuat.gov.tr
// Parses HTML content and detects changes via diff comparison

import { prisma } from "@/lib/prisma";
import { BaseProvider } from "./index";
import type { HealthCheckResult, ProviderConfig } from "./types";
import {
  classifyUpdate,
  generateAiSummary,
  generateDiff,
} from "@/lib/legal-scanner";

// ─── Types ──────────────────────────────────────────────────

export interface MevzuatDocument {
  mevzuatNo: string;
  mevzuatTur: string;
  title: string;
  resmiFazete: string;
  publishDate: Date;
  url: string;
  content: string;
}

interface MevzuatSearchResult {
  data: { mevzuatNo: string; mevzuatTur: string; ad: string; rg: string; url: string }[];
  totalCount: number;
}

// ─── Known procurement laws to track ────────────────────────

const TRACKED_LAWS = [
  { no: "4734", name: "Kamu İhale Kanunu" },
  { no: "4735", name: "Kamu İhale Sözleşmeleri Kanunu" },
  { no: "2886", name: "Devlet İhale Kanunu" },
  { no: "5018", name: "Kamu Mali Yönetimi ve Kontrol Kanunu" },
  { no: "6098", name: "Türk Borçlar Kanunu" },
];

const TRACKED_REGULATIONS = [
  "Yapım İşleri İhaleleri Uygulama Yönetmeliği",
  "Mal Alımı İhaleleri Uygulama Yönetmeliği",
  "Hizmet Alımı İhaleleri Uygulama Yönetmeliği",
  "Danışmanlık Hizmet Alımı İhaleleri Uygulama Yönetmeliği",
  "Elektronik İhale Uygulama Yönetmeliği",
  "Kamu İhale Genel Tebliği",
  "İhalelere Yönelik Başvurular Hakkında Yönetmelik",
];

// ─── Provider ───────────────────────────────────────────────

class MevzuatProvider extends BaseProvider<MevzuatDocument> {
  private readonly baseUrl: string;

  constructor() {
    const config: ProviderConfig = {
      name: "MEVZUAT",
      baseUrl: "https://www.mevzuat.gov.tr",
      rateLimitMs: 2000,
      maxTokens: 2,
      cache: { ttl: 86400, staleWhileRevalidate: true, key: "mevzuat" },
      maxRetries: 3,
      baseDelayMs: 1000,
      circuitBreakerThreshold: 5,
      circuitBreakerResetMs: 60_000,
    };
    super(config);
    this.baseUrl = config.baseUrl;
  }

  protected async doFetch(params: Record<string, unknown>): Promise<MevzuatDocument[]> {
    const keyword = (params.keyword as string) || "ihale";
    const tur = (params.tur as string) || "Kanun";
    return this.searchMevzuat(keyword, tur);
  }

  protected async doFetchById(id: string): Promise<MevzuatDocument | null> {
    return this.getMevzuatByNo(id);
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

  // ─── Search ─────────────────────────────────────────────

  async searchMevzuat(keyword: string, tur?: string): Promise<MevzuatDocument[]> {
    await this.rateLimiter.acquire();

    try {
      // mevzuat.gov.tr provides a search JSON endpoint
      const params = new URLSearchParams({
        MevzuatTur: tur || "",
        Kelime: keyword,
        Sayfa: "1",
      });

      const res = await fetch(`${this.baseUrl}/anasayfa/MevzuatFihristDetay662?${params}`, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "IhalePro/1.0 Legal Scanner",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) return [];

      const text = await res.text();
      let data: MevzuatSearchResult;
      try {
        data = JSON.parse(text);
      } catch {
        // If response is HTML, parse search results from it
        return this.parseHtmlSearchResults(text, keyword);
      }

      return (data.data || []).map((item) => ({
        mevzuatNo: item.mevzuatNo,
        mevzuatTur: item.mevzuatTur,
        title: item.ad,
        resmiFazete: item.rg,
        publishDate: this.parseRGDate(item.rg),
        url: item.url ? `${this.baseUrl}${item.url}` : `${this.baseUrl}/mevzuat?MevzuatNo=${item.mevzuatNo}`,
        content: "",
      }));
    } catch {
      return [];
    }
  }

  // ─── Get by law number ──────────────────────────────────

  async getMevzuatByNo(mevzuatNo: string): Promise<MevzuatDocument | null> {
    await this.rateLimiter.acquire();

    try {
      const url = `${this.baseUrl}/mevzuat?MevzuatNo=${mevzuatNo}&MevzuatTur=1`;
      const res = await fetch(url, {
        headers: { "User-Agent": "IhalePro/1.0 Legal Scanner" },
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) return null;

      const html = await res.text();
      return this.parseMevzuatPage(html, mevzuatNo, url);
    } catch {
      return null;
    }
  }

  // ─── Fetch full text of a tracked law ───────────────────

  async fetchLawText(lawNo: string): Promise<string | null> {
    const doc = await this.getMevzuatByNo(lawNo);
    return doc?.content || null;
  }

  // ─── Sync tracked laws & detect changes ─────────────────

  async syncTrackedLaws(): Promise<number> {
    const result = await this.logSync("sync-tracked-laws", async () => {
      let count = 0;

      for (const law of TRACKED_LAWS) {
        const doc = await this.getMevzuatByNo(law.no);
        if (!doc) continue;

        const existing = await prisma.legalUpdate.findFirst({
          where: {
            source: "MEVZUAT_GOV",
            title: { contains: law.no },
          },
          orderBy: { publishDate: "desc" },
        });

        // Detect changes via content diff
        if (existing?.rawContent && doc.content) {
          const hasChanges = existing.rawContent !== doc.content;
          if (!hasChanges) continue;

          const { category, impactLevel } = classifyUpdate(doc.title, doc.content);
          const aiSummary = generateAiSummary(doc.title, doc.content);
          const diffSections = generateDiff(existing.rawContent, doc.content);

          const update = await prisma.legalUpdate.create({
            data: {
              title: `${law.name} Değişiklik (${law.no})`,
              source: "MEVZUAT_GOV",
              category,
              summary: `${law.name} metninde değişiklik tespit edildi.`,
              aiSummary,
              impactLevel,
              originalUrl: doc.url,
              publishDate: new Date(),
              rawContent: doc.content,
            },
          });

          await prisma.legalUpdateDiff.create({
            data: {
              updateId: update.id,
              oldText: existing.rawContent,
              newText: doc.content,
              changedSections: JSON.parse(JSON.stringify(diffSections)),
            },
          });

          count++;
        } else if (!existing && doc.content) {
          // First time tracking — store baseline
          const { category, impactLevel } = classifyUpdate(doc.title, doc.content);
          await prisma.legalUpdate.create({
            data: {
              title: `${law.name} (${law.no})`,
              source: "MEVZUAT_GOV",
              category,
              summary: `${law.name} metni takibe alındı.`,
              impactLevel,
              originalUrl: doc.url,
              publishDate: doc.publishDate,
              rawContent: doc.content,
            },
          });
          count++;
        }
      }

      return count;
    });

    return result.recordCount;
  }

  // ─── Search tracked regulations ─────────────────────────

  async syncTrackedRegulations(): Promise<number> {
    const result = await this.logSync("sync-tracked-regulations", async () => {
      let count = 0;

      for (const regName of TRACKED_REGULATIONS) {
        const docs = await this.searchMevzuat(regName, "Yönetmelik");
        if (docs.length === 0) continue;

        const doc = docs[0];
        const existing = await prisma.legalUpdate.findFirst({
          where: {
            source: "MEVZUAT_GOV",
            title: { contains: regName.substring(0, 30) },
          },
          orderBy: { publishDate: "desc" },
        });

        if (!existing) {
          const { category, impactLevel } = classifyUpdate(doc.title, doc.content || regName);
          await prisma.legalUpdate.create({
            data: {
              title: doc.title || regName,
              source: "MEVZUAT_GOV",
              category,
              summary: `${regName} takibe alındı.`,
              impactLevel,
              originalUrl: doc.url,
              publishDate: doc.publishDate,
              rawContent: doc.content || null,
            },
          });
          count++;
        }
      }

      return count;
    });

    return result.recordCount;
  }

  // ─── HTML Parsing Helpers ───────────────────────────────

  private parseMevzuatPage(html: string, mevzuatNo: string, url: string): MevzuatDocument {
    // Extract title
    const titleMatch = html.match(/<h1[^>]*class="[^"]*baslik[^"]*"[^>]*>([\s\S]*?)<\/h1>/i)
      || html.match(/<title>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? this.stripHtml(titleMatch[1]).trim() : `Mevzuat No: ${mevzuatNo}`;

    // Extract main content
    const contentMatch = html.match(/<div[^>]*id="mevzuatMetni"[^>]*>([\s\S]*?)<\/div>/i)
      || html.match(/<div[^>]*class="[^"]*icerik[^"]*"[^>]*>([\s\S]*?)<\/div>/i)
      || html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);

    let content = "";
    if (contentMatch) {
      content = this.htmlToMarkdown(contentMatch[1]);
    }

    // Extract RG info
    const rgMatch = html.match(/Resmî Gazete[^:]*:\s*([\d.]+)/i)
      || html.match(/R\.G\.\s*Tarihi?\s*:\s*([\d.]+)/i);
    const rgDate = rgMatch ? rgMatch[1] : "";

    return {
      mevzuatNo,
      mevzuatTur: "Kanun",
      title,
      resmiFazete: rgDate,
      publishDate: this.parseRGDate(rgDate),
      url,
      content: content.substring(0, 50000), // Limit size
    };
  }

  private parseHtmlSearchResults(html: string, _keyword: string): MevzuatDocument[] {
    const results: MevzuatDocument[] = [];
    const rows = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];

    for (const row of rows.slice(0, 20)) {
      const linkMatch = row.match(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
      if (!linkMatch) continue;

      const href = linkMatch[1];
      const title = this.stripHtml(linkMatch[2]).trim();
      if (!title || title.length < 5) continue;

      const noMatch = href.match(/MevzuatNo=(\d+)/i);
      results.push({
        mevzuatNo: noMatch ? noMatch[1] : "",
        mevzuatTur: "Kanun",
        title,
        resmiFazete: "",
        publishDate: new Date(),
        url: href.startsWith("http") ? href : `${this.baseUrl}${href}`,
        content: "",
      });
    }

    return results;
  }

  private htmlToMarkdown(html: string): string {
    return html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<\/h[1-6]>/gi, "\n\n")
      .replace(/<h([1-6])[^>]*>/gi, (_, level) => "#".repeat(parseInt(level)) + " ")
      .replace(/<\/?strong>/gi, "**")
      .replace(/<\/?b>/gi, "**")
      .replace(/<\/?em>/gi, "*")
      .replace(/<\/?i>/gi, "*")
      .replace(/<li[^>]*>/gi, "- ")
      .replace(/<\/li>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
  }

  private parseRGDate(rgStr: string): Date {
    // Format: "01.01.2026" or "01/01/2026"
    const match = rgStr.match(/(\d{2})[./](\d{2})[./](\d{4})/);
    if (match) {
      return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
    }
    return new Date();
  }
}

// ─── Singleton ──────────────────────────────────────────────

const g = globalThis as unknown as { _mevzuatProvider?: MevzuatProvider };
export const mevzuatProvider = g._mevzuatProvider ?? (g._mevzuatProvider = new MevzuatProvider());
