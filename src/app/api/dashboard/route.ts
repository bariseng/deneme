import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);

    const [
      favoriteCount,
      applicationCount,
      upcomingDeadlines,
      newTendersThisWeek,
      closingThisWeek,
      recentFavorites,
      recentApplications,
      unreadNotifications,
    ] = await Promise.all([
      prisma.favorite.count({ where: { userId: user.id } }),
      prisma.application.count({ where: { userId: user.id } }),
      prisma.favorite.count({
        where: {
          userId: user.id,
          tender: {
            deadline: { gte: now, lte: new Date(now.getTime() + 7 * 86400000) },
          },
        },
      }),
      prisma.tender.count({
        where: { publishDate: { gte: weekStart } },
      }),
      prisma.tender.count({
        where: {
          deadline: { gte: now, lte: new Date(now.getTime() + 7 * 86400000) },
          status: "BASVURU_ACIK",
        },
      }),
      prisma.favorite.findMany({
        where: { userId: user.id },
        include: {
          tender: {
            select: {
              id: true, title: true, institution: true, city: true,
              tenderType: true, status: true, estimatedCost: true, deadline: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.application.findMany({
        where: { userId: user.id },
        include: {
          tender: {
            select: {
              id: true, title: true, institution: true, city: true,
              tenderType: true, deadline: true, estimatedCost: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 10,
      }),
      prisma.notification.count({
        where: { userId: user.id, isRead: false },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          favoriteCount,
          applicationCount,
          upcomingDeadlines,
          newTendersThisWeek,
          closingThisWeek,
          unreadNotifications,
        },
        recentFavorites,
        recentApplications,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Dashboard verileri alınamadı";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
