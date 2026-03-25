import { NextRequest, NextResponse } from "next/server";
import { ekapProvider } from "@/lib/providers/ekap-provider";

/**
 * POST /api/cron/sync-ekap
 * EKAP ihale senkronizasyonu — her 15-30 dakikada çalıştırılır.
 *
 * Query params:
 *   mode=incremental (default) — sadece yeni ihaleleri çek
 *   mode=full — tüm açık ihaleleri yeniden senkronize et
 *
 * Header: Authorization: Bearer <CRON_SECRET>
 */
export async function POST(request: NextRequest) {
  // Auth check
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 },
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") || "incremental";

  try {
    if (mode === "full") {
      return await runFullSync();
    }
    return await runIncrementalSync();
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** Incremental sync — only fetch recent tenders */
async function runIncrementalSync() {
  const result = await ekapProvider.logSync("incremental_sync", async () => {
    // Fetch last 24 hours of tenders
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const response = await ekapProvider.searchTenders({
      ihaleTarihBaslangic: yesterday.toISOString().split("T")[0],
      ihaleTarihBitis: now.toISOString().split("T")[0],
      ihaleDurumIdList: [1, 5], // BASVURU_ACIK + YAKLASAN
      sayfaBoyutu: 100,
    });

    const { inserted, updated, errors } = await ekapProvider.batchUpsert(
      response.list,
    );

    return inserted + updated - errors;
  });

  return NextResponse.json({
    success: result.status === "COMPLETED",
    mode: "incremental",
    ...result,
    timestamp: new Date().toISOString(),
  });
}

/** Full sync — reconcile all open tenders across multiple pages */
async function runFullSync() {
  const result = await ekapProvider.logSync("full_sync", async () => {
    let page = 1;
    let totalProcessed = 0;
    let hasMore = true;
    const pageSize = 50;

    while (hasMore) {
      const response = await ekapProvider.searchTenders({
        ihaleDurumIdList: [1, 5], // Open + upcoming
        sayfaNo: page,
        sayfaBoyutu: pageSize,
      });

      if (response.list.length === 0) {
        hasMore = false;
        break;
      }

      const { inserted, updated } = await ekapProvider.batchUpsert(
        response.list,
      );
      totalProcessed += inserted + updated;

      // Stop if we've fetched all pages
      if (page * pageSize >= response.totalCount) {
        hasMore = false;
      }

      page++;

      // Safety: max 100 pages (5000 tenders per daily limit)
      if (page > 100) break;
    }

    return totalProcessed;
  });

  return NextResponse.json({
    success: result.status === "COMPLETED",
    mode: "full",
    ...result,
    timestamp: new Date().toISOString(),
  });
}
