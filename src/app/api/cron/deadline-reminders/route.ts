import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/lib/services/notification-orchestrator";

/**
 * POST /api/cron/deadline-reminders
 * Sends deadline reminders for tenders expiring in 1, 3, 7 days
 * Should be called daily via Vercel Cron or external scheduler
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const reminderDays = [1, 3, 7];
    let totalSent = 0;

    for (const days of reminderDays) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + days);
      const dayStart = new Date(targetDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(targetDate);
      dayEnd.setHours(23, 59, 59, 999);

      // Find tenders with deadlines on the target date
      const tenders = await prisma.tender.findMany({
        where: {
          deadline: { gte: dayStart, lte: dayEnd },
          status: "BASVURU_ACIK",
        },
        select: { id: true, title: true, city: true, deadline: true },
      });

      if (tenders.length === 0) continue;

      // Find users who have favorited these tenders or have matching rules
      for (const tender of tenders) {
        // Users who favorited this tender
        const favUsers = await prisma.favorite.findMany({
          where: { tenderId: tender.id },
          select: { userId: true },
        });

        // Users with active notification rules matching the tender
        const ruleUsers = await prisma.notificationRule.findMany({
          where: {
            isActive: true,
            OR: [
              { cities: { has: tender.city } },
              { cities: { isEmpty: true } },
            ],
          },
          select: { userId: true },
        });

        // Deduplicate user IDs
        const userIds = [...new Set([
          ...favUsers.map((f) => f.userId),
          ...ruleUsers.map((r) => r.userId),
        ])];

        // Send notifications
        const priority = days <= 1 ? "urgent" : days <= 3 ? "high" : "normal";
        const deadlineStr = tender.deadline.toLocaleDateString("tr-TR");

        for (const userId of userIds) {
          try {
            await sendNotification({
              userId,
              category: "deadline",
              title: tender.title.substring(0, 100),
              message: `Son başvuru tarihi: ${deadlineStr} (${days} gün kaldı)`,
              data: {
                tenderId: tender.id,
                city: tender.city,
                daysLeft: String(days),
                deadline: deadlineStr,
              },
              priority: priority as "normal" | "high" | "urgent",
            });
            totalSent++;
          } catch {
            // Non-blocking
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      remindersSent: totalSent,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Cron hatası";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
