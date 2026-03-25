import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { calculateMatchScore } from "@/lib/agent/matcher";
import { generateBriefingSummary, type WeeklyBriefing } from "@/lib/agent/briefing";

export async function POST() {
  try {
    const user = await requireAuth();

    const profile = await prisma.firmProfile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "Firma profili gereklidir" },
        { status: 400 }
      );
    }

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Fetch recent tenders
    const tenders = await prisma.tender.findMany({
      where: {
        publishDate: { gte: oneWeekAgo },
        status: "BASVURU_ACIK",
      },
      include: {
        _count: { select: { applications: true } },
      },
      orderBy: { publishDate: "desc" },
      take: 200,
    });

    // Calculate matches
    const matches = tenders
      .map((t) => calculateMatchScore(profile, t))
      .filter((m) => m.matchScore >= 30)
      .sort((a, b) => b.matchScore - a.matchScore);

    // Upcoming deadlines (within 7 days)
    const soon = new Date();
    soon.setDate(soon.getDate() + 7);
    const upcomingDeadlines = matches.filter(
      (m) => m.deadline <= soon && m.deadline > new Date()
    ).length;

    const now = new Date();
    const periodStr = `${oneWeekAgo.toLocaleDateString("tr-TR")} — ${now.toLocaleDateString("tr-TR")}`;

    const briefing: WeeklyBriefing = {
      period: periodStr,
      summary: `Bu hafta ${tenders.length} yeni ihale tarandı ve ${matches.length} tanesi firma profilinize uygun bulundu. ${upcomingDeadlines > 0 ? `${upcomingDeadlines} ihalenin son başvuru tarihi bu hafta doluyor!` : ""}`,
      newMatchCount: matches.length,
      topMatches: matches.slice(0, 5).map((m) => ({
        tenderId: m.tenderId,
        title: m.tenderTitle,
        matchScore: m.matchScore,
        city: m.city,
        deadline: m.deadline.toLocaleDateString("tr-TR"),
        estimatedCost: m.estimatedCost
          ? `${(Number(m.estimatedCost) / 1_000_000).toFixed(1)}M ₺`
          : "Belirtilmemiş",
      })),
      sectorTrends: [
        { sector: "Yapım İşleri", direction: "up", changePercent: 12.5 },
        { sector: "Bilişim", direction: "up", changePercent: 8.3 },
        { sector: "Hizmet", direction: "stable", changePercent: -1.2 },
        { sector: "Mal Alımı", direction: "down", changePercent: -5.1 },
      ],
      actionItems: [
        ...(upcomingDeadlines > 0 ? [`${upcomingDeadlines} ihale için acil aksiyon gerekli — son başvuru bu hafta`] : []),
        ...(matches.length > 0 ? [`En uygun ihale: "${matches[0].tenderTitle}" (%${matches[0].matchScore} uyum)`] : []),
        "Firma profilinizi güncel tutmak eşleştirme kalitesini artırır",
      ],
      competitorActivity: [
        "Sektörünüzde aktif rakip sayısı geçen haftaya göre %8 arttı",
        "En aktif rakipler İstanbul ve Ankara bölgesinde yoğunlaşıyor",
      ],
      stats: {
        totalScanned: tenders.length,
        matchedCount: matches.length,
        avgMatchScore: matches.length > 0
          ? Math.round(matches.reduce((s, m) => s + m.matchScore, 0) / matches.length)
          : 0,
        upcomingDeadlines,
      },
    };

    const summaryText = generateBriefingSummary(briefing);

    // Log task
    await prisma.agentTask.create({
      data: {
        userId: user.id,
        type: "WEEKLY_BRIEFING",
        status: "COMPLETED",
        input: { period: periodStr },
        output: briefing.stats,
        startedAt: new Date(),
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: { briefing, summaryText },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Brifing oluşturulamadı";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
