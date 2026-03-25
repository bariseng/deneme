/**
 * NLP Intent Parser — Doğal dil sorgusundan ihale filtrelerine dönüştürme
 * Örnek: "İstanbul'da 5 milyon üstü yapım ihalesi bul" → { city: "İstanbul", minBudget: 5000000, type: "YAPIM" }
 */

import { CITIES } from "@/lib/utils/constants";

export interface ParsedIntent {
  action: "search" | "swot" | "bid_draft" | "match" | "briefing" | "general";
  filters: TenderFilters;
  rawQuery: string;
  confidence: number;
}

export interface TenderFilters {
  city?: string;
  cities?: string[];
  minBudget?: number;
  maxBudget?: number;
  tenderType?: string;
  keyword?: string;
  sector?: string;
  status?: string;
}

const BUDGET_PATTERNS: { pattern: RegExp; multiplier: number }[] = [
  { pattern: /(\d+(?:[.,]\d+)?)\s*milyar/i, multiplier: 1_000_000_000 },
  { pattern: /(\d+(?:[.,]\d+)?)\s*milyon/i, multiplier: 1_000_000 },
  { pattern: /(\d+(?:[.,]\d+)?)\s*bin/i, multiplier: 1_000 },
  { pattern: /(\d+(?:[.,]\d+)?)\s*[Mm](?!\w)/i, multiplier: 1_000_000 },
  { pattern: /(\d+(?:[.,]\d+)?)\s*₺/i, multiplier: 1 },
];

const TYPE_MAP: Record<string, string> = {
  yapım: "YAPIM",
  "yapım işi": "YAPIM",
  "yapım ihalesi": "YAPIM",
  inşaat: "YAPIM",
  "mal alımı": "MAL_ALIMI",
  "mal alım": "MAL_ALIMI",
  malzeme: "MAL_ALIMI",
  hizmet: "HIZMET",
  "hizmet alımı": "HIZMET",
  danışmanlık: "DANISMANLIK",
  müşavirlik: "DANISMANLIK",
};

const ACTION_KEYWORDS: Record<string, string[]> = {
  search: ["bul", "ara", "göster", "listele", "getir", "filtrele", "ihale"],
  swot: ["swot", "analiz", "girmeli", "katılmalı", "değerlendir", "risk"],
  bid_draft: ["teklif", "fiyat öner", "teklif hazırla", "birim fiyat", "taslak"],
  match: ["eşleştir", "uygun", "öner", "bana uygun", "profil"],
  briefing: ["özet", "haftalık", "rapor", "brifing", "briefing"],
};

function parseBudget(text: string): { min?: number; max?: number } {
  const result: { min?: number; max?: number } = {};

  for (const { pattern, multiplier } of BUDGET_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const value = parseFloat(match[1].replace(",", ".")) * multiplier;

      // Check context: "üstü/üzeri" → min, "altı/altında" → max
      const before = text.slice(Math.max(0, text.indexOf(match[0]) - 30), text.indexOf(match[0]));
      const after = text.slice(
        text.indexOf(match[0]) + match[0].length,
        text.indexOf(match[0]) + match[0].length + 30
      );
      const context = before + " " + after;

      if (/üst|üzer|fazla|büyük|aşan/i.test(context)) {
        result.min = value;
      } else if (/alt|az|küçük|düşük/i.test(context)) {
        result.max = value;
      } else if (/arası|ile|arasında|-/i.test(context)) {
        if (!result.min) result.min = value;
        else result.max = value;
      } else {
        // Default: treat as approximate target → ±30%
        result.min = value * 0.7;
        result.max = value * 1.3;
      }
      break;
    }
  }

  return result;
}

function parseCity(text: string): string | undefined {
  const lower = text.toLowerCase();
  for (const city of CITIES) {
    if (lower.includes(city.toLowerCase())) {
      return city;
    }
  }
  // Handle common abbreviations
  if (lower.includes("ist") && !lower.includes("iste")) return "İstanbul";
  if (lower.includes("ank")) return "Ankara";
  if (lower.includes("izm")) return "İzmir";
  return undefined;
}

function parseTenderType(text: string): string | undefined {
  const lower = text.toLowerCase();
  for (const [key, value] of Object.entries(TYPE_MAP)) {
    if (lower.includes(key)) return value;
  }
  return undefined;
}

function parseAction(text: string): ParsedIntent["action"] {
  const lower = text.toLowerCase();

  let bestAction: ParsedIntent["action"] = "general";
  let bestScore = 0;

  for (const [action, keywords] of Object.entries(ACTION_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestAction = action as ParsedIntent["action"];
    }
  }

  return bestAction;
}

function extractKeyword(text: string): string | undefined {
  // Remove city names, budget terms, type terms, and action words
  let cleaned = text;
  for (const city of CITIES) {
    cleaned = cleaned.replace(new RegExp(city, "gi"), "");
  }
  cleaned = cleaned
    .replace(/\d+(?:[.,]\d+)?\s*(milyar|milyon|bin|₺|[Mm])\b/gi, "")
    .replace(/(üstü|üzeri|altı|altında|arası|ile|arasında)/gi, "")
    .replace(/(bul|ara|göster|listele|getir|filtrele|lütfen|bana)/gi, "")
    .replace(/(yapım|hizmet|danışmanlık|mal alımı|inşaat|ihalesi?|ihale)/gi, "")
    .trim();

  const words = cleaned.split(/\s+/).filter((w) => w.length > 2);
  return words.length > 0 ? words.join(" ") : undefined;
}

export function parseNaturalLanguage(query: string): ParsedIntent {
  const action = parseAction(query);
  const city = parseCity(query);
  const budget = parseBudget(query);
  const tenderType = parseTenderType(query);
  const keyword = extractKeyword(query);

  const filters: TenderFilters = {};
  let confidence = 30; // base

  if (city) {
    filters.city = city;
    confidence += 20;
  }
  if (budget.min) {
    filters.minBudget = budget.min;
    confidence += 15;
  }
  if (budget.max) {
    filters.maxBudget = budget.max;
    confidence += 15;
  }
  if (tenderType) {
    filters.tenderType = tenderType;
    confidence += 15;
  }
  if (keyword) {
    filters.keyword = keyword;
    confidence += 10;
  }

  confidence = Math.min(95, confidence);

  return {
    action,
    filters,
    rawQuery: query,
    confidence,
  };
}
