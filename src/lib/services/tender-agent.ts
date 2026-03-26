// ─── Tender Matching Agent ─────────────────────────────────
// Firma profili embedding → ihale embedding karşılaştırma
// Cosine similarity ile eşleştirme, eşik üzeri bildirim

import { prisma } from "@/lib/prisma";
import {
  createEmbedding,
  createBatchEmbeddings,
  cosineSimilarity,
} from "@/lib/providers/ai-provider";
import { sendNotification } from "@/lib/services/notification-orchestrator";

// ─── Types ──────────────────────────────────────────────────

export interface MatchResult {
  tenderId: string;
  tenderTitle: string;
  score: number; // 0-100
  reasons: string[];
  city: string;
  deadline: string;
  estimatedCost: number | null;
}

export interface WeeklyReport {
  userId: string;
  period: { start: string; end: string };
  totalMatches: number;
  topMatches: MatchResult[];
  sectorTrends: string[];
  recommendations: string[];
}

// ─── Config ─────────────────────────────────────────────────

const MATCH_THRESHOLD = 60; // Minimum score to notify
const MAX_MATCHES_PER_SCAN = 20;

// ─── Profile Embedding ─────────────────────────────────────

export async function updateFirmEmbedding(userId: string): Promise<void> {
  const profile = await prisma.firmProfile.findUnique({
    where: { userId },
  });

  if (!profile) throw new Error("Firma profili bulunamadı");

  // Build text representation of firm profile
  const profileText = buildProfileText(profile);
  const embedding = await createEmbedding(profileText);

  await prisma.firmProfile.update({
    where: { userId },
    data: { embedding },
  });
}

function buildProfileText(profile: {
  companyName: string;
  sectors: string[];
  cities: string[];
  keywords: string[];
  preferredTypes: string[];
  experienceYears: number;
  maxBudget: unknown;
  minBudget: unknown;
}): string {
  const parts = [
    `Firma: ${profile.companyName}`,
    `Sektörler: ${profile.sectors.join(", ")}`,
    `Faaliyet İlleri: ${profile.cities.join(", ")}`,
    `Uzmanlık: ${profile.keywords.join(", ")}`,
    `İhale Türleri: ${profile.preferredTypes.join(", ")}`,
    `Deneyim: ${profile.experienceYears} yıl`,
    `Bütçe Aralığı: ₺${Number(profile.minBudget).toLocaleString("tr-TR")} - ₺${Number(profile.maxBudget).toLocaleString("tr-TR")}`,
  ];
  return parts.join(". ");
}

// ─── Tender Matching ────────────────────────────────────────

export async function matchTendersForUser(userId: string): Promise<MatchResult[]> {
  const profile = await prisma.firmProfile.findUnique({
    where: { userId },
  });

  if (!profile || profile.embedding.length === 0) {
    throw new Error("Firma profili veya embedding bulunamadı. Profili güncelleyin.");
  }

  // Get recent open tenders
  const tenders = await prisma.tender.findMany({
    where: {
      status: "BASVURU_ACIK",
      deadline: { gte: new Date() },
    },
    select: {
      id: true,
      title: true,
      description: true,
      tenderType: true,
      city: true,
      deadline: true,
      estimatedCost: true,
      requirements: true,
    },
    orderBy: { publishDate: "desc" },
    take: 100,
  });

  if (tenders.length === 0) return [];

  // Create embeddings for tenders
  const tenderTexts = tenders.map((t) =>
    [t.title, t.description?.substring(0, 500), t.city, t.tenderType]
      .filter(Boolean)
      .join(". "),
  );

  const tenderEmbeddings = await createBatchEmbeddings(tenderTexts);

  // Calculate similarity scores
  const matches: MatchResult[] = [];

  for (let i = 0; i < tenders.length; i++) {
    const similarity = cosineSimilarity(profile.embedding, tenderEmbeddings[i]);
    const score = Math.round(similarity * 100);

    // Apply bonus scoring
    const bonusScore = calculateBonusScore(profile, tenders[i]);
    const finalScore = Math.min(100, score + bonusScore);

    if (finalScore >= MATCH_THRESHOLD) {
      matches.push({
        tenderId: tenders[i].id,
        tenderTitle: tenders[i].title,
        score: finalScore,
        reasons: getMatchReasons(profile, tenders[i], similarity),
        city: tenders[i].city,
        deadline: tenders[i].deadline.toISOString(),
        estimatedCost: tenders[i].estimatedCost ? Number(tenders[i].estimatedCost) : null,
      });
    }
  }

  // Sort by score desc
  matches.sort((a, b) => b.score - a.score);
  return matches.slice(0, MAX_MATCHES_PER_SCAN);
}

function calculateBonusScore(
  profile: { cities: string[]; preferredTypes: string[]; maxBudget: unknown; minBudget: unknown },
  tender: { city: string; tenderType: string | null; estimatedCost: unknown },
): number {
  let bonus = 0;

  // City match
  if (profile.cities.includes(tender.city)) bonus += 10;

  // Type match
  if (tender.tenderType && profile.preferredTypes.includes(tender.tenderType)) bonus += 10;

  // Budget match
  const cost = Number(tender.estimatedCost || 0);
  const min = Number(profile.minBudget);
  const max = Number(profile.maxBudget);
  if (cost > 0 && cost >= min && cost <= max) bonus += 5;

  return bonus;
}

function getMatchReasons(
  profile: { cities: string[]; preferredTypes: string[]; keywords: string[]; sectors: string[] },
  tender: { city: string; tenderType: string | null; title: string },
  similarity: number,
): string[] {
  const reasons: string[] = [];

  if (similarity > 0.8) reasons.push("Çok yüksek profil uyumu");
  else if (similarity > 0.6) reasons.push("Yüksek profil uyumu");
  else reasons.push("Orta düzey profil uyumu");

  if (profile.cities.includes(tender.city)) reasons.push(`İl eşleşmesi: ${tender.city}`);
  if (tender.tenderType && profile.preferredTypes.includes(tender.tenderType)) {
    reasons.push(`İhale türü eşleşmesi: ${tender.tenderType}`);
  }

  const titleLower = tender.title.toLowerCase();
  const matchedKeywords = profile.keywords.filter((kw) => titleLower.includes(kw.toLowerCase()));
  if (matchedKeywords.length > 0) reasons.push(`Anahtar kelime: ${matchedKeywords.join(", ")}`);

  return reasons;
}

// ─── Scan & Notify ──────────────────────────────────────────

export async function runMatchScan(userId: string): Promise<{
  taskId: string;
  matchCount: number;
  topMatches: MatchResult[];
}> {
  // Create agent task
  const task = await prisma.agentTask.create({
    data: {
      userId,
      type: "MATCH_SCAN",
      status: "RUNNING",
      startedAt: new Date(),
    },
  });

  try {
    const matches = await matchTendersForUser(userId);

    // Save results
    for (const match of matches) {
      await prisma.agentResult.create({
        data: {
          taskId: task.id,
          userId,
          tenderId: match.tenderId,
          matchScore: match.score,
          analysis: JSON.parse(JSON.stringify({
            reasons: match.reasons,
            city: match.city,
            deadline: match.deadline,
            estimatedCost: match.estimatedCost,
          })),
          actionTaken: match.score >= 80 ? "notification_sent" : null,
        },
      });

      // High-score matches → notify
      if (match.score >= 80) {
        await sendNotification({
          userId,
          category: "tender_match",
          title: `Yüksek Eşleşme: ${match.tenderTitle.substring(0, 60)}`,
          message: `%${match.score} uyum skoru. ${match.reasons[0]}`,
          data: {
            tenderId: match.tenderId,
            score: String(match.score),
            city: match.city,
          },
          priority: match.score >= 90 ? "high" : "normal",
        });
      }
    }

    // Update task
    await prisma.agentTask.update({
      where: { id: task.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        output: JSON.parse(JSON.stringify({
          matchCount: matches.length,
          avgScore: matches.length > 0
            ? Math.round(matches.reduce((a, b) => a + b.score, 0) / matches.length)
            : 0,
        })),
      },
    });

    return { taskId: task.id, matchCount: matches.length, topMatches: matches.slice(0, 5) };
  } catch (error) {
    await prisma.agentTask.update({
      where: { id: task.id },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        error: error instanceof Error ? error.message : "Eşleştirme hatası",
      },
    });
    throw error;
  }
}

// ─── Weekly Report ──────────────────────────────────────────

export async function generateWeeklyReport(userId: string): Promise<WeeklyReport> {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  // Get all matches from the past week
  const results = await prisma.agentResult.findMany({
    where: {
      userId,
      createdAt: { gte: weekAgo },
      task: { type: "MATCH_SCAN" },
    },
    include: {
      tender: {
        select: { id: true, title: true, city: true, deadline: true, estimatedCost: true, tenderType: true },
      },
    },
    orderBy: { matchScore: "desc" },
    take: 50,
  });

  const topMatches: MatchResult[] = results
    .filter((r) => r.tender)
    .slice(0, 10)
    .map((r) => ({
      tenderId: r.tender!.id,
      tenderTitle: r.tender!.title,
      score: r.matchScore || 0,
      reasons: (r.analysis as { reasons?: string[] })?.reasons || [],
      city: r.tender!.city,
      deadline: r.tender!.deadline.toISOString(),
      estimatedCost: r.tender!.estimatedCost ? Number(r.tender!.estimatedCost) : null,
    }));

  // Sector trends from matched tenders
  const typeCounts: Record<string, number> = {};
  for (const r of results) {
    if (r.tender?.tenderType) {
      typeCounts[r.tender.tenderType] = (typeCounts[r.tender.tenderType] || 0) + 1;
    }
  }
  const sectorTrends = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([type, count]) => `${type}: ${count} ihale`);

  const recommendations: string[] = [];
  if (topMatches.length === 0) {
    recommendations.push("Bu hafta yüksek eşleşme bulunamadı. Firma profilinizi güncelleyin.");
  }
  if (topMatches.length > 5) {
    recommendations.push(`${topMatches.length} yüksek eşleşme bulundu. En yüksek puanlılara öncelik verin.`);
  }

  return {
    userId,
    period: { start: weekAgo.toISOString(), end: new Date().toISOString() },
    totalMatches: results.length,
    topMatches,
    sectorTrends,
    recommendations,
  };
}
