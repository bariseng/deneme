// ─── JV Matching Service ─────────────────────────────────────
// Firma profil vektörü, cosine similarity, tamamlayıcılık analizi

import { prisma } from "@/lib/prisma";
import { createEmbedding, createBatchEmbeddings, cosineSimilarity, complete } from "@/lib/providers/ai-provider";

// ─── Types ──────────────────────────────────────────────────

export interface FirmVector {
  companyId: string;
  companyName: string;
  cpvCodes: string[];
  experienceAmount: number;
  wonTenderCount: number;
  cities: string[];
  sectors: string[];
  capitalAmount: number;
  employeeCount: number;
  yearsActive: number;
}

export interface MatchResult {
  companyId: string;
  companyName: string;
  score: number; // 0-100
  breakdown: {
    embeddingScore: number;   // 0-30 cosine similarity
    complementarity: number;  // 0-25 tamamlayıcılık
    experienceScore: number;  // 0-20 deneyim uyumu
    geoScore: number;         // 0-15 coğrafi uyum
    capacityScore: number;    // 0-10 kapasite uyumu
  };
  explanation: string;
  complementaryAreas: string[];
  riskFactors: string[];
}

export interface PairAnalysis {
  score: number;
  breakdown: MatchResult["breakdown"];
  explanation: string;
  complementaryAreas: string[];
  riskFactors: string[];
  recommendation: string;
}

// ─── CPV Code Groups ────────────────────────────────────────

const CPV_GROUPS: Record<string, string[]> = {
  YAPIM: ["45"],
  HIZMET: ["50", "51", "55", "60", "63", "64", "65", "66", "70", "71", "72", "73", "74", "75", "76", "77", "79", "80", "85", "90", "92", "98"],
  MAL_ALIMI: ["03", "09", "14", "15", "16", "18", "19", "22", "24", "30", "31", "32", "33", "34", "35", "37", "38", "39", "41", "42", "43", "44", "48"],
  DANISMANLIK: ["71", "72", "73", "79"],
};

function cpvToSector(cpvCode: string): string {
  const prefix = cpvCode.substring(0, 2);
  for (const [sector, prefixes] of Object.entries(CPV_GROUPS)) {
    if (prefixes.includes(prefix)) return sector;
  }
  return "DİĞER";
}

function cpvOverlap(a: string[], b: string[]): { shared: string[]; uniqueA: string[]; uniqueB: string[] } {
  const setA = new Set(a.map((c) => c.substring(0, 2)));
  const setB = new Set(b.map((c) => c.substring(0, 2)));
  const shared = [...setA].filter((c) => setB.has(c));
  const uniqueA = [...setA].filter((c) => !setB.has(c));
  const uniqueB = [...setB].filter((c) => !setA.has(c));
  return { shared, uniqueA, uniqueB };
}

// ─── Build Firm Vector ──────────────────────────────────────

export async function buildFirmVector(companyId: string): Promise<FirmVector> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true, name: true, city: true, sector: true, foundedYear: true,
      employeeCount: true, capitalAmount: true, mersisData: true,
    },
  });
  if (!company) throw new Error("Firma bulunamadı");

  // Kazanılan ihalelerden CPV ve deneyim bilgisi
  const threeYearsAgo = new Date();
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

  const wonResults = await prisma.tenderResult.findMany({
    where: {
      winnerName: { contains: company.name, mode: "insensitive" },
      resultDate: { gte: threeYearsAgo },
    },
    include: {
      tender: { select: { oksCodes: true, city: true, tenderType: true } },
    },
  });

  const cpvCodes: string[] = [];
  const activeCities = new Set<string>();
  let totalWonAmount = 0;

  for (const result of wonResults) {
    totalWonAmount += Number(result.winnerAmount);
    if (result.tender.city) activeCities.add(result.tender.city);
    const codes = result.tender.oksCodes as string[] | null;
    if (codes) cpvCodes.push(...codes);
  }

  if (company.city) activeCities.add(company.city);

  // MERSİS faaliyet alanlarından ek sektör bilgisi
  const mersisData = company.mersisData as Record<string, unknown> | null;
  const mersisSectors: string[] = [];
  if (mersisData) {
    const activities = mersisData.activities as string[] | undefined;
    if (activities) mersisSectors.push(...activities);
  }

  const sectors = [
    ...(company.sector ? [company.sector] : []),
    ...mersisSectors,
    ...cpvCodes.map(cpvToSector),
  ];
  const uniqueSectors = [...new Set(sectors)];

  const yearsActive = company.foundedYear
    ? new Date().getFullYear() - company.foundedYear
    : 0;

  return {
    companyId: company.id,
    companyName: company.name,
    cpvCodes: [...new Set(cpvCodes)],
    experienceAmount: totalWonAmount,
    wonTenderCount: wonResults.length,
    cities: [...activeCities],
    sectors: uniqueSectors,
    capitalAmount: Number(company.capitalAmount || 0),
    employeeCount: company.employeeCount || 0,
    yearsActive,
  };
}

// ─── Profile Text for Embedding ─────────────────────────────

function vectorToText(v: FirmVector): string {
  const parts = [
    `Firma: ${v.companyName}`,
    v.sectors.length > 0 ? `Sektörler: ${v.sectors.join(", ")}` : "",
    v.cpvCodes.length > 0 ? `CPV: ${v.cpvCodes.join(", ")}` : "",
    v.cities.length > 0 ? `Şehirler: ${v.cities.join(", ")}` : "",
    v.wonTenderCount > 0 ? `Son 3 yıl kazanılan ihale: ${v.wonTenderCount}` : "",
    v.experienceAmount > 0 ? `Toplam iş deneyimi: ${Math.round(v.experienceAmount / 1_000_000)}M TL` : "",
    v.employeeCount > 0 ? `Çalışan sayısı: ${v.employeeCount}` : "",
    v.yearsActive > 0 ? `Faaliyet süresi: ${v.yearsActive} yıl` : "",
  ];
  return parts.filter(Boolean).join(". ");
}

// ─── Complementarity Analysis ───────────────────────────────

function analyzeComplementarity(a: FirmVector, b: FirmVector): {
  score: number;
  areas: string[];
  risks: string[];
} {
  const areas: string[] = [];
  const risks: string[] = [];
  let score = 0;

  // CPV code overlap analysis
  const overlap = cpvOverlap(a.cpvCodes, b.cpvCodes);

  if (overlap.uniqueA.length > 0 && overlap.uniqueB.length > 0) {
    score += 15; // Different specialties → complementary
    areas.push(`Farklı uzmanlık alanları: A=${overlap.uniqueA.length} / B=${overlap.uniqueB.length} benzersiz CPV`);
  }

  if (overlap.shared.length > 3) {
    score -= 5;
    risks.push(`${overlap.shared.length} ortak CPV kodu — rekabet riski`);
  }

  // Sector complementarity
  const sectorSetA = new Set(a.sectors);
  const sectorSetB = new Set(b.sectors);
  const commonSectors = [...sectorSetA].filter((s) => sectorSetB.has(s));
  const uniqueSectorsA = [...sectorSetA].filter((s) => !sectorSetB.has(s));
  const uniqueSectorsB = [...sectorSetB].filter((s) => !sectorSetA.has(s));

  if (uniqueSectorsA.length > 0 && uniqueSectorsB.length > 0) {
    score += 10;
    areas.push(`Tamamlayıcı sektörler: ${uniqueSectorsA.join("/")} + ${uniqueSectorsB.join("/")}`);
  }

  if (commonSectors.length > 0 && uniqueSectorsA.length === 0 && uniqueSectorsB.length === 0) {
    risks.push(`Aynı sektörlerde faaliyet — doğrudan rekabet`);
  }

  // Size complementarity (big + small = good)
  const capA = a.capitalAmount;
  const capB = b.capitalAmount;
  if (capA > 0 && capB > 0) {
    const ratio = Math.min(capA, capB) / Math.max(capA, capB);
    if (ratio < 0.3) {
      areas.push("Büyük-küçük firma tamamlayıcılığı");
    }
  }

  return { score: Math.max(0, Math.min(25, score)), areas, risks };
}

// ─── Geographic Score ───────────────────────────────────────

const NEIGHBOR_CITIES: Record<string, string[]> = {
  İstanbul: ["Kocaeli", "Tekirdağ", "Bursa", "Yalova"],
  Ankara: ["Eskişehir", "Konya", "Kırıkkale", "Çankırı", "Bolu", "Kırşehir"],
  İzmir: ["Manisa", "Aydın", "Balıkesir", "Muğla", "Denizli"],
  Bursa: ["İstanbul", "Kocaeli", "Yalova", "Bilecik", "Eskişehir", "Balıkesir"],
  Antalya: ["Burdur", "Isparta", "Konya", "Mersin", "Muğla"],
  Adana: ["Mersin", "Hatay", "Osmaniye", "Konya", "Niğde", "Kayseri"],
  Konya: ["Ankara", "Aksaray", "Karaman", "Antalya", "Isparta", "Afyon"],
  Gaziantep: ["Adıyaman", "Kilis", "Hatay", "Osmaniye", "Kahramanmaraş", "Şanlıurfa"],
};

function geoScore(a: FirmVector, b: FirmVector, targetCity?: string): number {
  let score = 0;
  const allCitiesA = new Set(a.cities);
  const allCitiesB = new Set(b.cities);

  // Combined city coverage
  const combined = new Set([...allCitiesA, ...allCitiesB]);
  if (combined.size > allCitiesA.size && combined.size > allCitiesB.size) {
    score += 5; // Broader geographic coverage together
  }

  // Target city coverage
  if (targetCity) {
    const aHasTarget = allCitiesA.has(targetCity) || a.cities.some((c) =>
      NEIGHBOR_CITIES[c]?.includes(targetCity) || NEIGHBOR_CITIES[targetCity]?.includes(c));
    const bHasTarget = allCitiesB.has(targetCity) || b.cities.some((c) =>
      NEIGHBOR_CITIES[c]?.includes(targetCity) || NEIGHBOR_CITIES[targetCity]?.includes(c));

    if (aHasTarget && bHasTarget) score += 10;
    else if (aHasTarget || bHasTarget) score += 5;
  } else {
    // Some geographic proximity
    const overlap = [...allCitiesA].filter((c) => allCitiesB.has(c));
    if (overlap.length > 0) score += 7;
  }

  return Math.min(15, score);
}

// ─── Match Two Companies ────────────────────────────────────

export async function matchCompanies(
  vectorA: FirmVector,
  vectorB: FirmVector,
  targetCity?: string,
  requiredAmount?: number,
): Promise<MatchResult> {
  // 1. Embedding similarity (0-30)
  const [embA, embB] = await createBatchEmbeddings([vectorToText(vectorA), vectorToText(vectorB)]);
  const similarity = cosineSimilarity(embA, embB);
  // Inverse: too similar = competitors. Sweet spot ~0.4-0.7
  const embeddingScore = similarity > 0.85
    ? Math.round(similarity * 15) // Penalize very similar (competitors)
    : Math.round(Math.min(similarity * 1.5, 1) * 30);

  // 2. Complementarity (0-25)
  const comp = analyzeComplementarity(vectorA, vectorB);

  // 3. Experience fit (0-20)
  let experienceScore = 0;
  if (requiredAmount && requiredAmount > 0) {
    const combinedExp = vectorA.experienceAmount + vectorB.experienceAmount;
    const ratio = combinedExp / requiredAmount;
    experienceScore = ratio >= 1 ? 20 : Math.round(ratio * 20);
  } else {
    // Both have some experience → good
    if (vectorA.wonTenderCount > 0 && vectorB.wonTenderCount > 0) {
      experienceScore = 15;
    } else if (vectorA.wonTenderCount > 0 || vectorB.wonTenderCount > 0) {
      experienceScore = 8;
    }
  }

  // 4. Geographic (0-15)
  const geo = geoScore(vectorA, vectorB, targetCity);

  // 5. Capacity fit (0-10)
  let capacityScore = 0;
  if (vectorA.yearsActive >= 3 && vectorB.yearsActive >= 3) capacityScore += 4;
  else if (vectorA.yearsActive >= 1 && vectorB.yearsActive >= 1) capacityScore += 2;
  if (vectorA.employeeCount > 0 && vectorB.employeeCount > 0) {
    capacityScore += Math.min(6, Math.round((vectorA.employeeCount + vectorB.employeeCount) / 50));
  }
  capacityScore = Math.min(10, capacityScore);

  const totalScore = embeddingScore + comp.score + experienceScore + geo + capacityScore;

  // Build explanation
  const explanationParts: string[] = [];
  if (comp.areas.length > 0) explanationParts.push(...comp.areas);
  if (embeddingScore > 20) explanationParts.push("Yüksek profil uyumu");
  if (experienceScore > 15) explanationParts.push("Birleşik iş deneyimi yeterli");
  if (geo > 10) explanationParts.push("Güçlü coğrafi kapsam");

  return {
    companyId: vectorB.companyId,
    companyName: vectorB.companyName,
    score: Math.min(100, totalScore),
    breakdown: {
      embeddingScore,
      complementarity: comp.score,
      experienceScore,
      geoScore: geo,
      capacityScore,
    },
    explanation: explanationParts.length > 0
      ? explanationParts.join(". ")
      : "Temel profil uyumu mevcut",
    complementaryAreas: comp.areas,
    riskFactors: comp.risks,
  };
}

// ─── Suggest Partners for Tender ────────────────────────────

export async function suggestPartners(
  companyId: string,
  tenderId?: string,
  limit = 20,
): Promise<MatchResult[]> {
  const myVector = await buildFirmVector(companyId);

  // Tender context
  let targetCity: string | undefined;
  let requiredAmount: number | undefined;
  let tenderCpvCodes: string[] = [];

  if (tenderId) {
    const tender = await prisma.tender.findUnique({
      where: { id: tenderId },
      select: { city: true, estimatedCost: true, oksCodes: true, title: true },
    });
    if (tender) {
      targetCity = tender.city;
      requiredAmount = Number(tender.estimatedCost || 0);
      tenderCpvCodes = (tender.oksCodes as string[] | null) || [];
    }
  }

  // Get candidate companies (exclude self)
  const candidates = await prisma.company.findMany({
    where: { id: { not: companyId } },
    select: { id: true, name: true },
    take: 200,
  });

  if (candidates.length === 0) return [];

  // Build vectors for candidates (batch for performance)
  const results: MatchResult[] = [];

  // Process in batches of 10
  for (let i = 0; i < candidates.length; i += 10) {
    const batch = candidates.slice(i, i + 10);
    const batchResults = await Promise.all(
      batch.map(async (c) => {
        try {
          const cVector = await buildFirmVector(c.id);

          // Pre-filter: if tender has CPV codes, skip companies with zero overlap
          if (tenderCpvCodes.length > 0 && cVector.cpvCodes.length > 0) {
            const overlap = cpvOverlap(tenderCpvCodes, cVector.cpvCodes);
            if (overlap.shared.length === 0 && cVector.wonTenderCount === 0) {
              return null; // No relevance
            }
          }

          return matchCompanies(myVector, cVector, targetCity, requiredAmount);
        } catch {
          return null;
        }
      }),
    );

    results.push(...batchResults.filter((r): r is MatchResult => r !== null && r.score > 15));
  }

  // Sort by score descending, take top N
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

// ─── Pair Analysis with AI ──────────────────────────────────

export async function analyzePair(
  companyIdA: string,
  companyIdB: string,
  tenderId?: string,
): Promise<PairAnalysis> {
  const [vectorA, vectorB] = await Promise.all([
    buildFirmVector(companyIdA),
    buildFirmVector(companyIdB),
  ]);

  let targetCity: string | undefined;
  let requiredAmount: number | undefined;
  let tenderTitle: string | undefined;

  if (tenderId) {
    const tender = await prisma.tender.findUnique({
      where: { id: tenderId },
      select: { city: true, estimatedCost: true, title: true },
    });
    if (tender) {
      targetCity = tender.city;
      requiredAmount = Number(tender.estimatedCost || 0);
      tenderTitle = tender.title;
    }
  }

  const matchResult = await matchCompanies(vectorA, vectorB, targetCity, requiredAmount);

  // Past JV collaboration check
  const pastCollabs = await prisma.jvMatch.count({
    where: {
      status: "ACCEPTED",
      OR: [
        { matchedCompanyId: companyIdB, request: { companyId: companyIdA } },
        { matchedCompanyId: companyIdA, request: { companyId: companyIdB } },
      ],
    },
  });

  // AI-generated recommendation
  const prompt = buildAnalysisPrompt(vectorA, vectorB, matchResult, tenderTitle, pastCollabs);
  const aiResult = await complete({
    prompt,
    systemPrompt: JV_SYSTEM_PROMPT,
    maxTokens: 512,
    temperature: 0.3,
    cacheKey: `jv_analysis:${companyIdA}:${companyIdB}:${tenderId || "general"}`,
    cacheTtl: 3600,
  });

  return {
    score: matchResult.score,
    breakdown: matchResult.breakdown,
    explanation: matchResult.explanation,
    complementaryAreas: matchResult.complementaryAreas,
    riskFactors: matchResult.riskFactors,
    recommendation: aiResult.text,
  };
}

// ─── Tender-Based Partner Suggestions ───────────────────────

export async function suggestForTender(
  tenderId: string,
  companyId: string,
): Promise<{ tender: { title: string; city: string; estimatedCost: number }; partners: MatchResult[] }> {
  const tender = await prisma.tender.findUnique({
    where: { id: tenderId },
    select: { title: true, city: true, estimatedCost: true },
  });
  if (!tender) throw new Error("İhale bulunamadı");

  const partners = await suggestPartners(companyId, tenderId, 10);

  return {
    tender: {
      title: tender.title,
      city: tender.city,
      estimatedCost: Number(tender.estimatedCost || 0),
    },
    partners,
  };
}

// ─── Prompts ────────────────────────────────────────────────

const JV_SYSTEM_PROMPT = `Sen Türkiye kamu ihale mevzuatında uzman bir iş ortaklığı danışmanısın.
4734 sayılı Kamu İhale Kanunu kapsamında iş ortaklığı (JV) değerlendirmesi yapıyorsun.
Kısa, net ve uygulanabilir öneriler ver. Türkçe yanıt ver.`;

function buildAnalysisPrompt(
  a: FirmVector,
  b: FirmVector,
  match: MatchResult,
  tenderTitle?: string,
  pastCollabs = 0,
): string {
  return `İki firma arasındaki iş ortaklığı uyumunu değerlendir.

Firma A: ${a.companyName}
- Sektörler: ${a.sectors.join(", ") || "Belirtilmemiş"}
- Aktif şehirler: ${a.cities.join(", ") || "Belirtilmemiş"}
- Son 3 yıl kazanılan ihale: ${a.wonTenderCount}
- Toplam iş deneyimi: ${Math.round(a.experienceAmount / 1_000_000)}M TL
- Faaliyet süresi: ${a.yearsActive} yıl

Firma B: ${b.companyName}
- Sektörler: ${b.sectors.join(", ") || "Belirtilmemiş"}
- Aktif şehirler: ${b.cities.join(", ") || "Belirtilmemiş"}
- Son 3 yıl kazanılan ihale: ${b.wonTenderCount}
- Toplam iş deneyimi: ${Math.round(b.experienceAmount / 1_000_000)}M TL
- Faaliyet süresi: ${b.yearsActive} yıl

Uyum Skoru: ${match.score}/100
Tamamlayıcı Alanlar: ${match.complementaryAreas.join("; ") || "Yok"}
Risk Faktörleri: ${match.riskFactors.join("; ") || "Yok"}
${tenderTitle ? `Hedef İhale: ${tenderTitle}` : ""}
${pastCollabs > 0 ? `Geçmiş iş birliği: ${pastCollabs} defa` : ""}

Değerlendirme ve öneri (3-5 cümle):`;
}

// ─── Sanitize Output (No PII) ───────────────────────────────

export function sanitizeMatchResult(result: MatchResult): MatchResult {
  return {
    companyId: result.companyId,
    companyName: result.companyName,
    score: result.score,
    breakdown: result.breakdown,
    explanation: result.explanation,
    complementaryAreas: result.complementaryAreas,
    riskFactors: result.riskFactors,
  };
}

export function sanitizePairAnalysis(analysis: PairAnalysis): PairAnalysis {
  // Strip any accidentally leaked VKN/financial details from AI text
  const cleaned = analysis.recommendation
    .replace(/\b\d{10,11}\b/g, "[GİZLİ]")  // VKN
    .replace(/\b\d{16}\b/g, "[GİZLİ]")     // MERSİS No
    .replace(/\bTR\d{24}\b/g, "[GİZLİ]");  // IBAN

  return { ...analysis, recommendation: cleaned };
}
