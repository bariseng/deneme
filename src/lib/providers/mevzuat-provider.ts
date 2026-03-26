// Mevzuat.gov.tr Provider — tracks legal changes to procurement laws/regulations
import { prisma } from "@/lib/prisma";
import { mevzuatLimiter } from "./rate-limiter";
import { ProviderCache } from "./cache";
import { classifyUpdate, generateAiSummary, generateDiff } from "@/lib/legal-scanner";

export interface MevzuatDocument {
  readonly mevzuatNo: string;
  readonly mevzuatTur: string;
  readonly title: string;
  readonly resmiFazete: string;
  readonly publishDate: Date;
  readonly url: string;
  /** For PDF-based laws, this contains metadata (download URL, size, date) rather than full text */
  readonly content: string;
}

interface TrackedLaw { readonly no: string; readonly name: string }

const BASE_URL = "https://www.mevzuat.gov.tr";
const CACHE_TTL_SECONDS = 86_400; // 24h

const TRACKED_LAWS: readonly TrackedLaw[] = [
  { no: "4734", name: "Kamu İhale Kanunu" },
  { no: "4735", name: "Kamu İhale Sözleşmeleri Kanunu" },
  { no: "2886", name: "Devlet İhale Kanunu" },
] as const;

const TRACKED_REGULATIONS: readonly string[] = [
  "Yapım İşleri Genel Şartnamesi",
  "Hizmet Alımı İhaleleri Uygulama Yönetmeliği",
  "Mal Alımı İhaleleri Uygulama Yönetmeliği",
  "Yapım İşleri İhaleleri Uygulama Yönetmeliği",
] as const;

const FETCH_HEADERS: HeadersInit = { "User-Agent": "Mozilla/5.0 (compatible; IhalePro/1.0)" };
const FETCH_TIMEOUT_MS = 15_000;
const cache = new ProviderCache("mevzuat", CACHE_TTL_SECONDS);

// PDF URL pattern: https://www.mevzuat.gov.tr/MevzuatMetin/1.5.{mevzuatNo}.pdf
// Since PDF parsing in serverless is impractical, we store the download URL + metadata.
function buildPdfUrl(lawNo: string): string {
  return `${BASE_URL}/MevzuatMetin/1.5.${lawNo}.pdf`;
}

/**
 * Check if the PDF exists on mevzuat.gov.tr using a HEAD request,
 * and return a MevzuatDocument with the PDF download URL as content reference.
 */
async function fetchLawPage(
  lawNo: string,
): Promise<MevzuatDocument | null> {
  await mevzuatLimiter.acquire();

  try {
    const pdfUrl = buildPdfUrl(lawNo);
    const res = await fetch(pdfUrl, {
      method: "HEAD",
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!res.ok) return null;

    const contentLength = res.headers.get("content-length");
    const lastModified = res.headers.get("last-modified");

    // Find human-readable name from tracked laws list
    const tracked = TRACKED_LAWS.find((l) => l.no === lawNo);
    const title = tracked ? tracked.name : `Kanun No: ${lawNo}`;

    return {
      mevzuatNo: lawNo,
      mevzuatTur: "Kanun",
      title,
      resmiFazete: lastModified ?? "",
      publishDate: lastModified ? new Date(lastModified) : new Date(),
      url: pdfUrl,
      // Store metadata since we cannot parse PDF content in serverless
      content: [
        `PDF İndirme: ${pdfUrl}`,
        contentLength ? `Boyut: ${Math.round(parseInt(contentLength) / 1024)} KB` : "",
        lastModified ? `Son Güncelleme: ${lastModified}` : "",
      ].filter(Boolean).join("\n"),
    };
  } catch (err) {
    console.error(
      `[mevzuat] fetchLawPage error for ${lawNo}:`,
      err instanceof Error ? err.message : String(err),
    );
    return null;
  }
}

/**
 * Search for a regulation by keyword.
 * Regulations don't have a predictable PDF URL pattern, so we store
 * what we know and link to the search page.
 */
async function searchRegulation(
  keyword: string,
): Promise<MevzuatDocument | null> {
  await mevzuatLimiter.acquire();

  try {
    // Try a simple search URL — if it redirects or fails, return a reference entry
    const searchUrl = `${BASE_URL}/anasayfa/MevzuatFihristDetayIframe?MevzuatTur=7&MevzuatNo=&Kelime=${encodeURIComponent(keyword)}`;

    return {
      mevzuatNo: "",
      mevzuatTur: "Yönetmelik",
      title: keyword,
      resmiFazete: "",
      publishDate: new Date(),
      url: searchUrl,
      content: `Yönetmelik arama: ${keyword}\nArama URL: ${searchUrl}`,
    };
  } catch (err) {
    console.error(
      `[mevzuat] searchRegulation error for "${keyword}":`,
      err instanceof Error ? err.message : String(err),
    );
    return null;
  }
}

async function syncSingleLaw(law: TrackedLaw): Promise<boolean> {
  const cacheKey = `law-${law.no}`;
  const doc = await cache.swr(cacheKey, () => fetchLawPage(law.no));
  if (!doc) return false;

  const existing = await prisma.legalUpdate.findFirst({
    where: {
      source: "MEVZUAT_GOV",
      title: { contains: law.no },
    },
    orderBy: { publishDate: "desc" },
  });

  // Compare metadata (PDF URL + size/date) to detect changes
  if (existing?.rawContent && existing.rawContent === doc.content) {
    return false;
  }

  // Change detected (different metadata = possible law update)
  if (existing?.rawContent) {
    const { category, impactLevel } = classifyUpdate(doc.title, doc.content);
    const aiSummary = generateAiSummary(doc.title, doc.content);
    const diffSections = generateDiff(existing.rawContent, doc.content);

    const update = await prisma.legalUpdate.create({
      data: {
        title: `${law.name} Değişiklik (${law.no})`,
        source: "MEVZUAT_GOV",
        category,
        summary: `${law.name} PDF dosyasında değişiklik tespit edildi. ${doc.url}`,
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

    return true;
  }

  // First time — store baseline
  if (!existing) {
    const { category, impactLevel } = classifyUpdate(doc.title, doc.content);

    await prisma.legalUpdate.create({
      data: {
        title: `${law.name} (${law.no})`,
        source: "MEVZUAT_GOV",
        category,
        summary: `${law.name} takibe alındı. PDF: ${doc.url}`,
        impactLevel,
        originalUrl: doc.url,
        publishDate: doc.publishDate,
        rawContent: doc.content,
      },
    });

    return true;
  }

  return false;
}

async function syncSingleRegulation(regName: string): Promise<boolean> {
  const cacheKey = `reg-${regName.substring(0, 20)}`;
  const doc = await cache.swr(cacheKey, () => searchRegulation(regName));
  if (!doc) return false;

  const existing = await prisma.legalUpdate.findFirst({
    where: {
      source: "MEVZUAT_GOV",
      title: { contains: regName.substring(0, 30) },
    },
    orderBy: { publishDate: "desc" },
  });

  if (existing) return false;

  const { category, impactLevel } = classifyUpdate(
    doc.title,
    doc.content || regName,
  );

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

  return true;
}

interface MevzuatProviderAPI {
  syncTrackedLaws(): Promise<number>;
  syncTrackedRegulations(): Promise<number>;
  fetchLawText(lawNo: string): Promise<string | null>;
  getMevzuatByNo(mevzuatNo: string): Promise<MevzuatDocument | null>;
}

function createMevzuatProvider(): MevzuatProviderAPI {
  return {
    async syncTrackedLaws(): Promise<number> {
      try {
        let count = 0;
        for (const law of TRACKED_LAWS) {
          const synced = await syncSingleLaw(law);
          if (synced) count++;
        }
        return count;
      } catch (err) {
        console.error(
          "[mevzuat] syncTrackedLaws failed:",
          err instanceof Error ? err.message : String(err),
        );
        return 0;
      }
    },

    async syncTrackedRegulations(): Promise<number> {
      try {
        let count = 0;
        for (const regName of TRACKED_REGULATIONS) {
          const synced = await syncSingleRegulation(regName);
          if (synced) count++;
        }
        return count;
      } catch (err) {
        console.error(
          "[mevzuat] syncTrackedRegulations failed:",
          err instanceof Error ? err.message : String(err),
        );
        return 0;
      }
    },

    async fetchLawText(lawNo: string): Promise<string | null> {
      try {
        const doc = await fetchLawPage(lawNo);
        return doc?.content || null;
      } catch {
        return null;
      }
    },

    async getMevzuatByNo(
      mevzuatNo: string,
    ): Promise<MevzuatDocument | null> {
      try {
        return await fetchLawPage(mevzuatNo);
      } catch {
        return null;
      }
    },
  };
}

const g = globalThis as unknown as { _mevzuatProvider?: MevzuatProviderAPI };

export const mevzuatProvider =
  g._mevzuatProvider ?? (g._mevzuatProvider = createMevzuatProvider());
