import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    // Validate cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    const log = await prisma.ekapSyncLog.create({
      data: { status: "running" },
    });

    // EKAP senkronizasyon simülasyonu
    const fetched = 10 + Math.floor(Math.random() * 30);
    const newRecords = Math.floor(fetched * 0.3);
    const updated = Math.floor(fetched * 0.2);

    await prisma.ekapSyncLog.update({
      where: { id: log.id },
      data: {
        finishedAt: new Date(),
        totalFetched: fetched,
        newRecords,
        updatedRecords: updated,
        status: "completed",
      },
    });

    // Yeni ihaleler için bildirim kurallarını kontrol et
    const rules = await prisma.notificationRule.findMany({
      where: { isActive: true },
      include: { user: { select: { id: true } } },
    });

    let notificationsCreated = 0;
    for (const rule of rules) {
      if (newRecords > 0) {
        await prisma.notification.create({
          data: {
            userId: rule.user.id,
            type: "YENI_IHALE",
            title: `${newRecords} yeni ihale bulundu`,
            message: `"${rule.name}" kuralınıza uyan ${newRecords} yeni ihale eklendi.`,
            link: "/ihaleler",
          },
        });
        notificationsCreated++;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        syncId: log.id,
        totalFetched: fetched,
        newRecords,
        updatedRecords: updated,
        notificationsCreated,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Senkronizasyon hatası";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const lastSync = await prisma.ekapSyncLog.findFirst({
      orderBy: { startedAt: "desc" },
    });

    return NextResponse.json({ success: true, data: lastSync });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync durumu alınamadı";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
