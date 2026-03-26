// ─── AI İhale Analiz Servisi ──────────────────────────────
// Şartname özeti, risk noktaları, gerekli belgeler, teklif fiyat önerisi
// Claude primary + OpenAI fallback, cache + token tracking

import { prisma } from "@/lib/prisma";
import { complete, streamComplete, type AiCompletionResult } from "@/lib/providers/ai-provider";
import { useAICredit } from "@/lib/quota";

// ─── Types ──────────────────────────────────────────────────

export interface TenderAnalysisInput {
  tenderId: string;
  title: string;
  description?: string;
  requirements?: string;
  tenderType?: string;
  estimatedCost?: number;
  city?: string;
  deadline?: string;
  institution?: string;
}

export interface TenderAnalysis {
  summary: string;
  keyDates: string;
  risks: string;
  requiredDocuments: string[];
  effortLevel: "DUSUK" | "ORTA" | "YUKSEK";
  confidence: number;
  eligibilityNotes: string;
}

export interface PriceSuggestion {
  suggestedMin: number;
  suggestedMax: number;
  optimalBid: number;
  reasoning: string;
  marketContext: string;
  competitorEstimate: number;
  winProbability: number;
}

export interface EligibilityCheck {
  eligible: boolean;
  score: number; // 0-100
  matchingCriteria: string[];
  missingCriteria: string[];
  recommendations: string[];
}

// ─── Prompt Templates ───────────────────────────────────────

const ANALYSIS_PROMPT = (input: TenderAnalysisInput) => `
Aşağıdaki kamu ihalesini detaylı analiz et:

İHALE BİLGİLERİ:
- Başlık: ${input.title}
- Kurum: ${input.institution || "Belirtilmemiş"}
- İhale Türü: ${input.tenderType || "Belirtilmemiş"}
- Tahmini Bedel: ${input.estimatedCost ? `₺${input.estimatedCost.toLocaleString("tr-TR")}` : "Belirtilmemiş"}
- İl: ${input.city || "Belirtilmemiş"}
- Son Başvuru: ${input.deadline || "Belirtilmemiş"}
${input.description ? `\nAÇIKLAMA:\n${input.description.substring(0, 3000)}` : ""}
${input.requirements ? `\nGEREKSİNİMLER:\n${input.requirements.substring(0, 3000)}` : ""}

Aşağıdaki formatta JSON yanıt ver:
{
  "summary": "İhalenin kapsamlı özeti (3-5 cümle)",
  "keyDates": "Önemli tarihler ve süreçler",
  "risks": "Risk analizi ve dikkat edilmesi gereken noktalar",
  "requiredDocuments": ["Gerekli belge 1", "Gerekli belge 2", ...],
  "effortLevel": "DUSUK|ORTA|YUKSEK",
  "confidence": 0.0-1.0,
  "eligibilityNotes": "Katılım için genel uygunluk notları"
}

KURALLAR:
- 4734 sayılı Kamu İhale Kanunu çerçevesinde analiz yap
- Standart gerekli belgeleri dahil et (bilanço, iş deneyim, SGK, vergi borcu vb.)
- Risk seviyesini ihale türü ve büyüklüğüne göre değerlendir
- Sadece JSON formatında yanıt ver, başka metin ekleme
`;

const PRICE_SUGGESTION_PROMPT = (
  input: TenderAnalysisInput,
  historicalData?: { avgPrice: number; minPrice: number; maxPrice: number; count: number },
) => `
Aşağıdaki ihale için teklif fiyat önerisi yap:

İHALE:
- Başlık: ${input.title}
- Kurum: ${input.institution || "Belirtilmemiş"}
- Tahmini Bedel: ${input.estimatedCost ? `₺${input.estimatedCost.toLocaleString("tr-TR")}` : "Belirtilmemiş"}
- İl: ${input.city || "Belirtilmemiş"}
- İhale Türü: ${input.tenderType || "Belirtilmemiş"}
${input.description ? `\nKAPSAM:\n${input.description.substring(0, 2000)}` : ""}

${historicalData ? `
GEÇMİŞ VERİLER (benzer ihaleler):
- Ortalama Kazanan Fiyat: ₺${historicalData.avgPrice.toLocaleString("tr-TR")}
- En Düşük: ₺${historicalData.minPrice.toLocaleString("tr-TR")}
- En Yüksek: ₺${historicalData.maxPrice.toLocaleString("tr-TR")}
- Örnek Sayısı: ${historicalData.count}
` : "Geçmiş veri mevcut değil, genel piyasa bilgisiyle öner."}

JSON yanıt ver:
{
  "suggestedMin": number,
  "suggestedMax": number,
  "optimalBid": number,
  "reasoning": "Fiyat önerisi gerekçesi",
  "marketContext": "Piyasa koşulları değerlendirmesi",
  "competitorEstimate": number,
  "winProbability": 0-100
}

KURALLAR:
- Muhafazakâr fiyatlama öner (düşük fiyat riski < yüksek fiyat riski)
- Yaklaşık maliyet varsa, %85-95 arası öner
- Geçmiş veriler varsa onları referans al
- Sadece JSON formatında yanıt ver
`;

const ELIGIBILITY_PROMPT = (
  input: TenderAnalysisInput,
  firmProfile: { sectors: string[]; cities: string[]; experienceYears: number; keywords: string[] },
) => `
Firma profili ile ihale uygunluk kontrolü yap:

İHALE:
- Başlık: ${input.title}
- İhale Türü: ${input.tenderType || "Belirtilmemiş"}
- İl: ${input.city || "Belirtilmemiş"}
- Tahmini Bedel: ${input.estimatedCost ? `₺${input.estimatedCost.toLocaleString("tr-TR")}` : "Belirtilmemiş"}
${input.requirements ? `\nGEREKSİNİMLER:\n${input.requirements.substring(0, 2000)}` : ""}

FİRMA PROFİLİ:
- Sektörler: ${firmProfile.sectors.join(", ")}
- Faaliyet İlleri: ${firmProfile.cities.join(", ")}
- Deneyim: ${firmProfile.experienceYears} yıl
- Uzmanlık Alanları: ${firmProfile.keywords.join(", ")}

JSON yanıt ver:
{
  "eligible": true/false,
  "score": 0-100,
  "matchingCriteria": ["Eşleşen kriter 1", ...],
  "missingCriteria": ["Eksik kriter 1", ...],
  "recommendations": ["Öneri 1", ...]
}

KURALLAR:
- 4734 sayılı Kanun gerekliliklerini kontrol et
- İş deneyim belgesi, mali yeterlilik, mesleki yeterlilik değerlendir
- Coğrafi uygunluğu kontrol et
- Sadece JSON formatında yanıt ver
`;

// ─── Analysis Functions ─────────────────────────────────────

export async function analyzeTender(
  userId: string,
  input: TenderAnalysisInput,
): Promise<TenderAnalysis> {
  // Check cache first
  const existing = await prisma.aiTenderSummary.findFirst({
    where: { tenderId: input.tenderId },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    return {
      summary: existing.summary,
      keyDates: existing.keyDates || "",
      risks: existing.risks || "",
      requiredDocuments: [],
      effortLevel: (existing.effortLevel as TenderAnalysis["effortLevel"]) || "ORTA",
      confidence: existing.confidence || 0.7,
      eligibilityNotes: "",
    };
  }

  // Check AI credit
  const credit = await useAICredit(userId, "summary", `İhale analizi: ${input.title.substring(0, 50)}`);
  if (!credit.success) {
    throw new Error(credit.message || "AI kredi limiti doldu");
  }

  const result = await complete({
    prompt: ANALYSIS_PROMPT(input),
    maxTokens: 2048,
    temperature: 0.2,
    cacheKey: `analysis:${input.tenderId}`,
    cacheTtl: 86400,
  });

  const analysis = parseJsonResponse<TenderAnalysis>(result.text);

  // Save to DB
  await prisma.aiTenderSummary.create({
    data: {
      tenderId: input.tenderId,
      summary: analysis.summary,
      keyDates: analysis.keyDates,
      risks: analysis.risks,
      effortLevel: analysis.effortLevel,
      confidence: analysis.confidence,
    },
  });

  return analysis;
}

export function analyzeTenderStream(
  input: TenderAnalysisInput,
): ReadableStream<Uint8Array> {
  return streamComplete({
    prompt: ANALYSIS_PROMPT(input),
    maxTokens: 2048,
    temperature: 0.2,
  });
}

export async function suggestPrice(
  userId: string,
  input: TenderAnalysisInput,
): Promise<PriceSuggestion> {
  // Check AI credit
  const credit = await useAICredit(userId, "estimate", `Fiyat önerisi: ${input.title.substring(0, 50)}`);
  if (!credit.success) {
    throw new Error(credit.message || "AI kredi limiti doldu");
  }

  // Fetch historical data for similar tenders
  const historicalData = await getHistoricalPriceData(input);

  const result = await complete({
    prompt: PRICE_SUGGESTION_PROMPT(input, historicalData || undefined),
    maxTokens: 1024,
    temperature: 0.2,
    cacheKey: `price:${input.tenderId}`,
    cacheTtl: 43200, // 12 hours
  });

  const suggestion = parseJsonResponse<PriceSuggestion>(result.text);

  // Save win probability
  if (input.tenderId && suggestion.optimalBid) {
    await prisma.winProbability.create({
      data: {
        tenderId: input.tenderId,
        userId,
        bidAmount: suggestion.optimalBid,
        probability: suggestion.winProbability,
        competitorEst: suggestion.competitorEstimate,
        analysisData: JSON.parse(JSON.stringify({
          suggestedMin: suggestion.suggestedMin,
          suggestedMax: suggestion.suggestedMax,
          reasoning: suggestion.reasoning,
          historicalData,
        })),
      },
    });
  }

  return suggestion;
}

export async function checkEligibility(
  userId: string,
  input: TenderAnalysisInput,
): Promise<EligibilityCheck> {
  // Get firm profile
  const firmProfile = await prisma.firmProfile.findUnique({
    where: { userId },
  });

  if (!firmProfile) {
    throw new Error("Firma profili bulunamadı. Önce firma profilinizi oluşturun.");
  }

  const credit = await useAICredit(userId, "swot", `Uygunluk kontrolü: ${input.title.substring(0, 50)}`);
  if (!credit.success) {
    throw new Error(credit.message || "AI kredi limiti doldu");
  }

  const result = await complete({
    prompt: ELIGIBILITY_PROMPT(input, {
      sectors: firmProfile.sectors,
      cities: firmProfile.cities,
      experienceYears: firmProfile.experienceYears,
      keywords: firmProfile.keywords,
    }),
    maxTokens: 1024,
    temperature: 0.2,
    cacheKey: `eligibility:${input.tenderId}:${userId}`,
    cacheTtl: 43200,
  });

  return parseJsonResponse<EligibilityCheck>(result.text);
}

// ─── Helpers ────────────────────────────────────────────────

async function getHistoricalPriceData(
  input: TenderAnalysisInput,
): Promise<{ avgPrice: number; minPrice: number; maxPrice: number; count: number } | null> {
  // Find similar completed tenders
  const where: Record<string, unknown> = {
    status: "SONUCLANDI",
  };
  if (input.tenderType) where.tenderType = input.tenderType;
  if (input.city) where.city = input.city;

  const results = await prisma.tenderResult.findMany({
    where: {
      tender: where,
      winnerAmount: { not: 0 },
    },
    select: { winnerAmount: true },
    take: 50,
    orderBy: { createdAt: "desc" },
  });

  if (results.length < 3) return null;

  const prices = results
    .map((r) => Number(r.winnerAmount))
    .filter((p) => p > 0);

  if (prices.length === 0) return null;

  return {
    avgPrice: prices.reduce((a, b) => a + b, 0) / prices.length,
    minPrice: Math.min(...prices),
    maxPrice: Math.max(...prices),
    count: prices.length,
  };
}

function parseJsonResponse<T>(text: string): T {
  // Extract JSON from response (may be wrapped in markdown code blocks)
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
  if (!jsonMatch) {
    throw new Error("AI yanıtı JSON formatında değil");
  }

  try {
    return JSON.parse(jsonMatch[1].trim()) as T;
  } catch {
    throw new Error("AI yanıtı geçerli JSON değil");
  }
}
