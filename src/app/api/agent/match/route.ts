import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { calculateMatchScore } from "@/lib/agent/matcher";

export async function POST() {
  try {
    const user = await requireAuth();

    const profile = await prisma.firmProfile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "Önce firma profilinizi oluşturmalısınız" },
        { status: 400 }
      );
    }

    // Fetch active tenders
    const tenders = await prisma.tender.findMany({
      where: {
        status: "BASVURU_ACIK",
        deadline: { gt: new Date() },
      },
      include: {
        _count: { select: { applications: true } },
      },
      orderBy: { deadline: "asc" },
      take: 100,
    });

    // Calculate match scores
    const matches = tenders
      .map((tender) => calculateMatchScore(profile, tender))
      .filter((m) => m.matchScore >= 30)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 20);

    // Create agent task
    const task = await prisma.agentTask.create({
      data: {
        userId: user.id,
        type: "MATCH_SCAN",
        status: "COMPLETED",
        input: { profileId: profile.id, tenderCount: tenders.length },
        output: { matchCount: matches.length, topScore: matches[0]?.matchScore || 0 },
        startedAt: new Date(),
        completedAt: new Date(),
      },
    });

    // Save results
    for (const match of matches.slice(0, 10)) {
      await prisma.agentResult.create({
        data: {
          taskId: task.id,
          userId: user.id,
          firmProfileId: profile.id,
          tenderId: match.tenderId,
          matchScore: match.matchScore,
          analysis: {
            reasons: match.reasons,
            competitorInsight: match.competitorInsight,
          },
          actionTaken: match.matchScore >= 80 ? "notification_sent" : null,
        },
      });

      // Send notification for high matches
      if (match.matchScore >= 80) {
        await prisma.notification.create({
          data: {
            userId: user.id,
            type: "YENI_IHALE",
            title: `%${match.matchScore} uyumlu ihale bulundu!`,
            message: `"${match.tenderTitle}" ihalesine profiliniz %${match.matchScore} oranında uyumlu.`,
            link: `/ihaleler/${match.tenderId}`,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        taskId: task.id,
        matches,
        totalScanned: tenders.length,
        matchedCount: matches.length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Eşleştirme yapılamadı";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
