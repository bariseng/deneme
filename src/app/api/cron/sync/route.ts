import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { ekapProvider } from "@/lib/providers/ekap-provider";
import { resmiGazeteProvider } from "@/lib/providers/resmi-gazete-provider";
import { kapProvider } from "@/lib/providers/kap-provider";

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

    let fetched = 0;
    let newRecords = 0;
    let updated = 0;

    if (isFeatureEnabled("USE_REAL_EKAP_DATA")) {
      // ── Real EKAP sync: fetch from lastSyncDate to now ──
      const lastSync = await prisma.dataSyncLog.findFirst({
        where: { provider: "EKAP", status: "COMPLETED" },
        orderBy: { completedAt: "desc" },
      });

      const now = new Date();
      const lastSyncDate = lastSync?.completedAt ?? new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const response = await ekapProvider.searchTenders({
        ihaleTarihBaslangic: lastSyncDate.toISOString().split("T")[0],
        ihaleTarihBitis: now.toISOString().split("T")[0],
        sayfaBoyutu: 100,
      });

      fetched = response.list.length;

      if (response.list.length > 0) {
        const result = await ekapProvider.batchUpsert(response.list);
        newRecords = result.inserted;
        updated = result.updated;
      }

      // Log to DataSyncLog as well
      await prisma.dataSyncLog.create({
        data: {
          provider: "EKAP",
          operation: "cron_sync",
          status: "COMPLETED",
          recordCount: fetched,
          startedAt: now,
          completedAt: new Date(),
        },
      });
    } else {
      // ── Mock simulation (original behavior) ──
      fetched = 10 + Math.floor(Math.random() * 30);
      newRecords = Math.floor(fetched * 0.3);
      updated = Math.floor(fetched * 0.2);
    }

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

    // ── Resmi Gazete + KAP sync (parallel, non-blocking) ──
    const [gazetteResult, kapResult] = await Promise.allSettled([
      resmiGazeteProvider.syncDailyGazette().catch(() => 0),
      kapProvider.syncFromKap().catch(() => ({ synced: 0, errors: 0, duration: 0 })),
    ]);

    const gazetteCount = gazetteResult.status === "fulfilled" ? gazetteResult.value : 0;
    const kapSynced = kapResult.status === "fulfilled" ? kapResult.value : { synced: 0, errors: 0, duration: 0 };

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
        realData: isFeatureEnabled("USE_REAL_EKAP_DATA"),
        totalFetched: fetched,
        newRecords,
        updatedRecords: updated,
        notificationsCreated,
        resmiGazete: gazetteCount,
        kapSync: kapSynced,
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

    // Also get DataSyncLog for real provider syncs
    const lastRealSync = await prisma.dataSyncLog.findFirst({
      where: { provider: "EKAP" },
      orderBy: { completedAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: lastSync,
      realDataSync: lastRealSync,
      realDataEnabled: isFeatureEnabled("USE_REAL_EKAP_DATA"),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync durumu alınamadı";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
