// ─── İçerik Moderasyon Servisi ─────────────────────────────
// AI tabanlı moderasyon (Claude API) + Türkçe küfür/hakaret filtresi
// KVKK uyumu: kişisel veri tespiti

import { complete } from "@/lib/providers/ai-provider";

// ─── Types ──────────────────────────────────────────────────

export interface ModerationResult {
  approved: boolean;
  reasons: string[];
  score: number; // 0-100, higher = more problematic
  categories: ModerationCategory[];
  sanitizedContent?: string;
}

export type ModerationCategory =
  | "PROFANITY"
  | "HARASSMENT"
  | "SPAM"
  | "PERSONAL_DATA"
  | "ILLEGAL"
  | "ADULT"
  | "CLEAN";

// ─── Turkish Profanity Filter ───────────────────────────────

// Common Turkish profanity/slur patterns (obfuscated for safety)
const PROFANITY_PATTERNS: RegExp[] = [
  /\bam[iı]na?\b/i,
  /\bs[iı]kt[iı]r\b/i,
  /\borospu\b/i,
  /\bp[iı]ç\b/i,
  /\byarr?a[kğ]\b/i,
  /\bg[oö]t\b(?!\s*(ür|er))/i,
  /\blan\b.*\b(ger[iı]z|sal|mal)\b/i,
  /\bsal[aâ]k\b/i,
  /\bger[iı]zek[aâ]l[iı]\b/i,
  /\bmal\b(?=\s+(m[iı]s[iı]n|s[iı]n))/i,
  /\baptal\b/i,
  /\bhayvan\b(?=\s+(her[iı]f|m[iı]s[iı]n))/i,
  /\bdayyus\b/i,
  /\bşerefsiz\b/i,
  /\bhaysiyetsiz\b/i,
  /\bnamussuz\b/i,
  /\bpipi\s*k[aâ]fa\b/i,
];

// Spam patterns
const SPAM_PATTERNS: RegExp[] = [
  /(.)\1{5,}/,                    // Repeated characters: aaaaaaa
  /https?:\/\/\S+/gi,            // URLs (flag for review, not auto-reject)
  /\b(kazan|ücretsiz|bedava|tıkla|hemen)\b.*\b(kazan|ücretsiz|bedava|tıkla|hemen)\b/i,
  /(.{10,})\1{2,}/,              // Repeated phrases
  /\b\d{10,}\b/,                 // Long numbers (phone etc.)
];

// KVKK: Personal data patterns
const PERSONAL_DATA_PATTERNS: RegExp[] = [
  /\b\d{11}\b/,                  // TC Kimlik No (11 digits)
  /\b\d{3}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}\b/, // Phone numbers
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/, // Email addresses
  /\bIBAN\b\s*:?\s*TR\d{2}\s*\d{4}/i, // IBAN
];

// ─── Quick Filter (No AI) ───────────────────────────────────

export function quickFilter(content: string): ModerationResult {
  const reasons: string[] = [];
  const categories: ModerationCategory[] = [];
  let score = 0;

  // Profanity check
  for (const pattern of PROFANITY_PATTERNS) {
    if (pattern.test(content)) {
      categories.push("PROFANITY");
      reasons.push("Küfür/hakaret içeriği tespit edildi");
      score += 40;
      break;
    }
  }

  // Spam check
  let spamCount = 0;
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(content)) spamCount++;
  }
  if (spamCount >= 2) {
    categories.push("SPAM");
    reasons.push("Spam içerik şüphesi");
    score += 30;
  }

  // KVKK: Personal data check
  for (const pattern of PERSONAL_DATA_PATTERNS) {
    if (pattern.test(content)) {
      categories.push("PERSONAL_DATA");
      reasons.push("Kişisel veri içeriği tespit edildi (KVKK uyarısı)");
      score += 20;
      break;
    }
  }

  if (categories.length === 0) categories.push("CLEAN");

  return {
    approved: score < 40,
    reasons,
    score: Math.min(100, score),
    categories,
  };
}

// ─── AI Moderation (Claude API) ─────────────────────────────

export async function aiModerate(content: string): Promise<ModerationResult> {
  // First run quick filter
  const quickResult = quickFilter(content);

  // If quick filter already rejected, no need for AI
  if (quickResult.score >= 60) {
    return quickResult;
  }

  try {
    const result = await complete({
      prompt: `Aşağıdaki Türkçe kullanıcı içeriğini moderasyon açısından değerlendir:

"${content.substring(0, 2000)}"

JSON yanıt ver:
{
  "approved": true/false,
  "score": 0-100,
  "categories": ["PROFANITY"|"HARASSMENT"|"SPAM"|"PERSONAL_DATA"|"ILLEGAL"|"ADULT"|"CLEAN"],
  "reasons": ["sebep1", ...]
}

KURALLAR:
- Küfür, hakaret, ırkçılık → REDDEDILDI
- KVKK: TC kimlik, telefon, e-posta, IBAN gibi kişisel veriler → UYARI
- Reklam, spam → REDDEDILDI
- Normal ihale tartışması, teknik soru → ONAYLANDI
- Sadece JSON formatında yanıt ver`,
      maxTokens: 256,
      temperature: 0.1,
      cacheKey: undefined,
    });

    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const aiResult = JSON.parse(jsonMatch[0]) as {
        approved: boolean;
        score: number;
        categories: ModerationCategory[];
        reasons: string[];
      };

      // Merge quick filter + AI results
      const mergedScore = Math.max(quickResult.score, aiResult.score);
      const mergedCategories = [...new Set([...quickResult.categories, ...aiResult.categories])];
      const mergedReasons = [...new Set([...quickResult.reasons, ...aiResult.reasons])];

      return {
        approved: mergedScore < 50,
        score: mergedScore,
        categories: mergedCategories.filter((c) => c !== "CLEAN"),
        reasons: mergedReasons,
      };
    }
  } catch (err) {
    console.warn("AI moderation error, falling back to quick filter:", err);
  }

  return quickResult;
}

// ─── Sanitize Content ───────────────────────────────────────

export function sanitizeContent(html: string): string {
  // Remove script tags and event handlers
  let clean = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/on\w+\s*=\s*'[^']*'/gi, "")
    .replace(/javascript\s*:/gi, "")
    .replace(/<iframe\b[^>]*>/gi, "")
    .replace(/<object\b[^>]*>/gi, "")
    .replace(/<embed\b[^>]*>/gi, "");

  // Mask personal data for KVKK
  clean = clean.replace(/\b(\d{3})\d{5}(\d{3})\b/g, "$1*****$2"); // TC Kimlik
  clean = clean.replace(
    /\b([A-Za-z0-9._%+-]{2})[A-Za-z0-9._%+-]*(@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g,
    "$1***$2",
  ); // Email

  return clean;
}

// ─── Moderate & Sanitize Pipeline ───────────────────────────

export async function moderateContent(
  content: string,
  useAi: boolean = false,
): Promise<ModerationResult> {
  const result = useAi ? await aiModerate(content) : quickFilter(content);

  if (result.approved) {
    result.sanitizedContent = sanitizeContent(content);
  }

  return result;
}
