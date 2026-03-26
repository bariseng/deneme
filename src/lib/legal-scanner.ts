import { prisma } from "@/lib/prisma";
import { LegalSource, LegalCategory, ImpactLevel } from "@/generated/prisma/client";
import { resmiGazeteProvider } from "@/lib/providers/resmi-gazete-provider";
import { mevzuatProvider } from "@/lib/providers/mevzuat-provider";

// ─── TYPES ──────────────────────────────────────────────────

export interface RawLegalItem {
  title: string;
  source: LegalSource;
  url: string;
  publishDate: Date;
  rawContent: string;
}

// ─── REAL SCANNERS ──────────────────────────────────────────

export async function scanOfficialGazette(): Promise<RawLegalItem[]> {
  try {
    const entries = await resmiGazeteProvider.fetchDailyGazette();
    return entries.map((e) => ({
      title: e.title,
      source: "RESMI_GAZETE" as LegalSource,
      url: e.url,
      publishDate: e.publishDate,
      rawContent: e.content || e.title,
    }));
  } catch {
    return [];
  }
}

export async function scanKikAnnouncements(): Promise<RawLegalItem[]> {
  // KİK announcements are fetched via resmiGazeteProvider.syncKikAnnouncements
  // Here we return empty — the cron job handles persistence directly
  return [];
}

export async function scanMevzuatChanges(): Promise<number> {
  try {
    const lawCount = await mevzuatProvider.syncTrackedLaws();
    const regCount = await mevzuatProvider.syncTrackedRegulations();
    return lawCount + regCount;
  } catch {
    return 0;
  }
}

// ─── CLASSIFY ───────────────────────────────────────────────

export function classifyUpdate(title: string, rawContent: string): { category: LegalCategory; impactLevel: ImpactLevel } {
  const titleLower = title.toLowerCase();
  const contentLower = rawContent.toLowerCase();

  // Category
  let category: LegalCategory = "DUYURU";
  if (titleLower.includes("kanun")) category = "KANUN";
  else if (titleLower.includes("yönetmelik") || titleLower.includes("yonetmelik")) category = "YONETMELIK";
  else if (titleLower.includes("tebliğ") || titleLower.includes("teblig")) category = "TEBLIG";

  // Impact
  let impactLevel: ImpactLevel = "LOW";
  const highKeywords = ["eşik değer", "parasal limit", "değişiklik yapılması", "kanunun"];
  const criticalKeywords = ["kanun değişikliği", "kaldırılmıştır", "yürürlükten"];
  const mediumKeywords = ["güncellen", "düzenlen", "belirlenen"];

  if (criticalKeywords.some((k) => contentLower.includes(k))) impactLevel = "CRITICAL";
  else if (highKeywords.some((k) => contentLower.includes(k))) impactLevel = "HIGH";
  else if (mediumKeywords.some((k) => contentLower.includes(k))) impactLevel = "MEDIUM";

  return { category, impactLevel };
}

// ─── AI SUMMARY (mock) ──────────────────────────────────────

export function generateAiSummary(title: string, rawContent: string): string {
  // Mock AI summary — in production would call OpenAI/Anthropic
  const sentences = rawContent.split(/[.!?]\s/).filter((s) => s.trim().length > 20);
  const keyPoints: string[] = [];

  if (title.toLowerCase().includes("eşik değer") || rawContent.includes("eşik değer")) {
    keyPoints.push("İhale eşik değerleri ve parasal limitler güncellendi. Yeni limitler tüm ihale türleri için geçerli.");
  }
  if (rawContent.includes("değiştirilmiştir") || rawContent.includes("eklenmiştir")) {
    keyPoints.push("Mevcut mevzuatta madde değişiklikleri yapıldı. İlgili kanun/yönetmelik maddeleri güncellendi.");
  }
  if (rawContent.includes("elektronik") || rawContent.includes("EKAP")) {
    keyPoints.push("Elektronik ihale süreçlerinde yeni düzenlemeler getirildi.");
  }

  if (keyPoints.length === 0) {
    keyPoints.push(sentences[0] || "Detaylar için tam metni inceleyiniz.");
  }

  // Ensure 3 points
  while (keyPoints.length < 3) {
    const next = sentences[keyPoints.length];
    keyPoints.push(next ? next.substring(0, 120) + "." : "Detaylar için orijinal kaynağı inceleyiniz.");
  }

  return keyPoints.slice(0, 3).map((p, i) => `${i + 1}. ${p}`).join("\n");
}

export function generateImpactAnalysis(title: string, rawContent: string, companySector?: string): string {
  // Mock AI impact analysis
  const sector = companySector || "genel";
  const lines: string[] = [
    `## ${title} — Firma Etki Analizi`,
    "",
    `### Sektörünüz: ${sector.toUpperCase()}`,
    "",
  ];

  if (rawContent.includes("eşik değer")) {
    lines.push("**Doğrudan Etki:** Yeni eşik değerler firmanızın başvurabileceği ihale havuzunu genişletebilir.");
    lines.push("**Aksiyon:** Güncel parasal limitleri teklif stratejinize yansıtın.");
  } else if (rawContent.includes("kanun")) {
    lines.push("**Doğrudan Etki:** Kanun değişikliği ihale yeterlilik kriterlerini etkileyebilir.");
    lines.push("**Aksiyon:** Yeni yeterlilik şartlarını mevcut belgelerinizle karşılaştırın.");
  } else {
    lines.push("**Doğrudan Etki:** Bu düzenleme ihale süreçlerinizi orta düzeyde etkileyebilir.");
    lines.push("**Aksiyon:** Değişiklikleri ihale ekibinizle paylaşın.");
  }

  lines.push("");
  lines.push("**Risk Değerlendirmesi:** Mevcut ihalelerinizde geriye dönük bir etki beklenmemektedir.");
  lines.push("");
  lines.push("*Bu analiz AI tarafından oluşturulmuştur. Hukuki danışmanlık yerine geçmez.*");

  return lines.join("\n");
}

// ─── DIFF GENERATION ────────────────────────────────────────

export interface DiffSection {
  section: string;
  type: "added" | "removed" | "modified";
  oldContent?: string;
  newContent?: string;
}

export function generateDiff(oldText: string, newText: string): DiffSection[] {
  const sections: DiffSection[] = [];

  if (!oldText && newText) {
    sections.push({ section: "Yeni Eklenen", type: "added", newContent: newText });
    return sections;
  }

  // Simple line-by-line diff
  const oldLines = oldText.split("\n").filter((l) => l.trim());
  const newLines = newText.split("\n").filter((l) => l.trim());

  const oldSet = new Set(oldLines);
  const newSet = new Set(newLines);

  for (const line of oldLines) {
    if (!newSet.has(line)) {
      sections.push({ section: "Kaldırılan", type: "removed", oldContent: line });
    }
  }

  for (const line of newLines) {
    if (!oldSet.has(line)) {
      sections.push({ section: "Eklenen", type: "added", newContent: line });
    }
  }

  if (sections.length === 0) {
    sections.push({ section: "Değişiklik yok", type: "modified", oldContent: oldText, newContent: newText });
  }

  return sections;
}

// ─── SEED / SCAN ────────────────────────────────────────────

export async function runLegalScan() {
  const results = [];

  // 1. Scan Resmi Gazete for procurement-related publications
  const gazetteCount = await resmiGazeteProvider.syncDailyGazette();

  // 2. Scan KİK announcements
  const kikCount = await resmiGazeteProvider.syncKikAnnouncements();

  // 3. Scan KİK Kurul Kararları
  const kikDecisionCount = await resmiGazeteProvider.syncKikDecisions();

  // 4. Check tracked laws for changes (mevzuat.gov.tr)
  const mevzuatCount = await scanMevzuatChanges();

  // 5. Also process any direct gazette items not yet saved
  const gazetteItems = await scanOfficialGazette();
  for (const item of gazetteItems) {
    const exists = await prisma.legalUpdate.findFirst({
      where: { originalUrl: item.url },
    });
    if (exists) continue;

    const { category, impactLevel } = classifyUpdate(item.title, item.rawContent);
    const aiSummary = generateAiSummary(item.title, item.rawContent);
    const summary = item.rawContent.substring(0, 300) + (item.rawContent.length > 300 ? "..." : "");

    const update = await prisma.legalUpdate.create({
      data: {
        title: item.title,
        source: item.source,
        category,
        summary,
        aiSummary,
        impactLevel,
        originalUrl: item.url,
        publishDate: item.publishDate,
        rawContent: item.rawContent,
      },
    });

    results.push(update);
  }

  return {
    newUpdates: results.length,
    gazetteSync: gazetteCount,
    kikSync: kikCount,
    kikDecisions: kikDecisionCount,
    mevzuatSync: mevzuatCount,
    total: results.length + gazetteCount + kikCount + kikDecisionCount + mevzuatCount,
  };
}

// ─── QUERIES ────────────────────────────────────────────────

export async function getLegalUpdates(filters: {
  category?: string;
  impactLevel?: string;
  source?: string;
  page?: number;
  limit?: number;
}) {
  const where: Record<string, unknown> = {};
  if (filters.category) where.category = filters.category;
  if (filters.impactLevel) where.impactLevel = filters.impactLevel;
  if (filters.source) where.source = filters.source;

  const page = filters.page || 1;
  const limit = filters.limit || 20;

  const [items, total] = await Promise.all([
    prisma.legalUpdate.findMany({
      where,
      orderBy: { publishDate: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.legalUpdate.count({ where }),
  ]);

  return { items, total, page, totalPages: Math.ceil(total / limit) };
}

export async function getLegalUpdateById(id: string) {
  return prisma.legalUpdate.findUnique({
    where: { id },
    include: { diffs: true },
  });
}

export async function getUserAlert(userId: string) {
  return prisma.userLegalAlert.findUnique({ where: { userId } });
}

export async function upsertUserAlert(
  userId: string,
  categories: string[],
  impactLevels: string[],
  isActive: boolean
) {
  return prisma.userLegalAlert.upsert({
    where: { userId },
    create: { userId, categories, impactLevels, isActive },
    update: { categories, impactLevels, isActive },
  });
}

export async function getLegalStats() {
  const [total, byCategory, byImpact] = await Promise.all([
    prisma.legalUpdate.count(),
    prisma.legalUpdate.groupBy({ by: ["category"], _count: true }),
    prisma.legalUpdate.groupBy({ by: ["impactLevel"], _count: true }),
  ]);

  return { total, byCategory, byImpact };
}

// ─── CONSTANTS ──────────────────────────────────────────────

export const CATEGORY_LABELS: Record<string, string> = {
  KANUN: "Kanun",
  YONETMELIK: "Yönetmelik",
  TEBLIG: "Tebliğ",
  DUYURU: "Duyuru",
};

export const SOURCE_LABELS: Record<string, string> = {
  RESMI_GAZETE: "Resmî Gazete",
  KIK: "KİK",
  MEVZUAT_GOV: "mevzuat.gov.tr",
};

export const IMPACT_LABELS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  LOW: { label: "Düşük Etki", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
  MEDIUM: { label: "Orta Etki", color: "text-yellow-700", bg: "bg-yellow-50", border: "border-yellow-200" },
  HIGH: { label: "Yüksek Etki", color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" },
  CRITICAL: { label: "Kritik Etki", color: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
};
