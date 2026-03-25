import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateMatchScore } from "@/lib/agent/matcher";

/**
 * Cron Job: Her 6 saatte çalışan firma-ihale eşleştirme taraması
 * Vercel Cron veya external cron service tarafından tetiklenir
 * Header: Authorization: Bearer <CRON_SECRET>
 */
export async function POST(request: NextRequest) {
  try {
    // Validate cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env["CRON_SECRET"];

    if (!cronSecret) {
      return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    // Get all active firm profiles
    const profiles = await prisma.firmProfile.findMany({
      where: { isActive: true },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    if (profiles.length === 0) {
      return NextResponse.json({
        success: true,
        data: { message: "Aktif firma profili bulunamadı", processed: 0 },
      });
    }

    // Get active tenders with upcoming deadlines
    const tenders = await prisma.tender.findMany({
      where: {
        status: "BASVURU_ACIK",
        deadline: { gt: new Date() },
      },
      include: {
        _count: { select: { applications: true } },
      },
      orderBy: { deadline: "asc" },
      take: 200,
    });

    let totalMatches = 0;
    let notificationsSent = 0;

    for (const profile of profiles) {
      // Create task
      const task = await prisma.agentTask.create({
        data: {
          userId: profile.userId,
          type: "MATCH_SCAN",
          status: "RUNNING",
          input: { cronTriggered: true, tenderCount: tenders.length },
          startedAt: new Date(),
        },
      });

      try {
        const matches = tenders
          .map((t) => calculateMatchScore(profile, t))
          .filter((m) => m.matchScore >= 40)
          .sort((a, b) => b.matchScore - a.matchScore)
          .slice(0, 15);

        totalMatches += matches.length;

        // Save results
        for (const match of matches) {
          await prisma.agentResult.create({
            data: {
              taskId: task.id,
              userId: profile.userId,
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

          // High-match notification
          if (match.matchScore >= 80) {
            await prisma.notification.create({
              data: {
                userId: profile.userId,
                type: "YENI_IHALE",
                title: `İhale Avcısı: %${match.matchScore} uyumlu ihale!`,
                message: `"${match.tenderTitle}" — ${match.city} | Profilinize %${match.matchScore} uyumlu.`,
                link: `/ihaleler/${match.tenderId}`,
              },
            });
            notificationsSent++;
          }
        }

        await prisma.agentTask.update({
          where: { id: task.id },
          data: {
            status: "COMPLETED",
            output: { matchCount: matches.length, topScore: matches[0]?.matchScore || 0 },
            completedAt: new Date(),
          },
        });
      } catch (taskError) {
        await prisma.agentTask.update({
          where: { id: task.id },
          data: {
            status: "FAILED",
            error: taskError instanceof Error ? taskError.message : "Bilinmeyen hata",
            completedAt: new Date(),
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        profilesProcessed: profiles.length,
        tendersScanned: tenders.length,
        totalMatches,
        notificationsSent,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cron job hatası";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
