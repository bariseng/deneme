/**
 * Firma-İhale Eşleştirme Motoru
 * Embedding benzerlikleri + kural tabanlı skor hesaplama
 */

import type { Tender, FirmProfile } from "@/generated/prisma";

export interface MatchResult {
  tenderId: string;
  tenderTitle: string;
  matchScore: number; // 0-100
  reasons: string[];
  competitorInsight?: string;
  deadline: Date;
  estimatedCost: unknown;
  city: string;
}

interface TenderWithDetails extends Tender {
  _count?: { applications: number };
}

/**
 * Simple text-based embedding (cosine similarity proxy)
 * In production, replace with actual embedding API (OpenAI, Cohere, etc.)
 */
function textToVector(text: string): number[] {
  const keywords = [
    "yapım", "inşaat", "beton", "altyapı", "üstyapı", "yol", "köprü",
    "bilişim", "yazılım", "donanım", "ağ", "siber", "veri",
    "sağlık", "tıbbi", "hastane", "ilaç", "laboratuvar",
    "eğitim", "okul", "üniversite", "öğretim",
    "enerji", "elektrik", "güneş", "rüzgar", "doğalgaz",
    "ulaşım", "metro", "otobüs", "tren", "havalimanı",
    "çevre", "atık", "arıtma", "geri dönüşüm",
    "güvenlik", "kamera", "alarm", "koruma",
    "temizlik", "peyzaj", "bakım", "onarım",
    "danışmanlık", "müşavirlik", "proje", "denetim",
  ];

  const lower = text.toLowerCase();
  return keywords.map((kw) => {
    const count = (lower.match(new RegExp(kw, "g")) || []).length;
    return Math.min(count / 3, 1);
  });
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function calculateMatchScore(
  profile: FirmProfile,
  tender: TenderWithDetails
): MatchResult {
  let score = 0;
  const reasons: string[] = [];

  // 1. Sector/Type match (max 30 points)
  const tenderType = tender.tenderType;
  if (profile.preferredTypes.includes(tenderType)) {
    score += 25;
    reasons.push("İhale türü firma tercihleriyle uyumlu");
  }

  // 2. City match (max 20 points)
  if (profile.cities.includes(tender.city)) {
    score += 20;
    reasons.push(`${tender.city} firma faaliyet bölgesinde`);
  } else {
    // Nearby city bonus (simplified)
    score += 5;
  }

  // 3. Budget fit (max 20 points)
  const cost = tender.estimatedCost;
  if (cost) {
    const costNum = Number(cost);
    const maxBudget = Number(profile.maxBudget);
    const minBudget = Number(profile.minBudget);

    if (costNum >= minBudget && costNum <= maxBudget) {
      score += 20;
      reasons.push("Bütçe firma kapasitesine uygun");
    } else if (costNum <= maxBudget * 1.3) {
      score += 10;
      reasons.push("Bütçe firma kapasitesine yakın (konsorsiyum değerlendirilebilir)");
    } else {
      score += 3;
      reasons.push("Bütçe firma kapasitesini aşıyor");
    }
  }

  // 4. Keyword / embedding similarity (max 20 points)
  const profileText = [
    ...profile.sectors,
    ...profile.keywords,
    profile.companyName,
  ].join(" ");
  const tenderText = [
    tender.title,
    tender.description || "",
    tender.institution,
  ].join(" ");

  const profileVec = profile.embedding.length > 0
    ? profile.embedding
    : textToVector(profileText);
  const tenderVec = textToVector(tenderText);
  const similarity = cosineSimilarity(profileVec, tenderVec);
  const embeddingScore = Math.round(similarity * 20);
  score += embeddingScore;
  if (embeddingScore > 10) {
    reasons.push("İhale içeriği firma uzmanlık alanıyla yüksek uyumlu");
  }

  // 5. Timeline bonus (max 10 points)
  const daysLeft = Math.ceil(
    (tender.deadline.getTime() - Date.now()) / 86400000
  );
  if (daysLeft > 14) {
    score += 10;
    reasons.push(`Yeterli hazırlık süresi (${daysLeft} gün)`);
  } else if (daysLeft > 5) {
    score += 5;
    reasons.push(`Sınırlı hazırlık süresi (${daysLeft} gün)`);
  } else if (daysLeft > 0) {
    score += 2;
    reasons.push(`Acil! Sadece ${daysLeft} gün kaldı`);
  }

  // Competition insight
  const appCount = tender._count?.applications || 0;
  let competitorInsight: string | undefined;
  if (appCount > 5) {
    competitorInsight = `Yoğun rekabet: ${appCount} firma başvurdu, kazanma olasılığı ~%${Math.max(5, Math.round(100 / (appCount + 1)))}`;
  } else if (appCount > 0) {
    competitorInsight = `Orta rekabet: ${appCount} firma başvurdu, kazanma olasılığı ~%${Math.round(100 / (appCount + 1))}`;
  } else {
    competitorInsight = "Düşük rekabet: Henüz başvuru yok, erken avantaj fırsatı";
  }

  score = Math.min(98, Math.max(5, score));

  return {
    tenderId: tender.id,
    tenderTitle: tender.title,
    matchScore: score,
    reasons,
    competitorInsight,
    deadline: tender.deadline,
    estimatedCost: tender.estimatedCost,
    city: tender.city,
  };
}

export function generateProfileEmbedding(profile: {
  sectors: string[];
  keywords: string[];
  companyName: string;
}): number[] {
  const text = [...profile.sectors, ...profile.keywords, profile.companyName].join(" ");
  return textToVector(text);
}
