import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ekapProvider } from "@/lib/providers/ekap-provider";

/**
 * POST /api/cron/reconcile-ekap
 * Weekly reconciliation — Pazar gecesi 02:00
 * Compares last 30 days of DB data against EKAP source
 * Fixes mismatches, updates statuses, removes orphans
 *
 * Header: Authorization: Bearer <CRON_SECRET>
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  try {
    const result = await ekapProvider.logSync("weekly_reconciliation", async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Step 1: Get all DB tenders from last 30 days with EKAP source
      const dbTenders = await prisma.tender.findMany({
        where: {
          source: "EKAP",
          publishDate: { gte: thirtyDaysAgo },
        },
        select: { id: true, ekapNo: true, status: true, title: true },
      });

      let updated = 0;
      let orphansRemoved = 0;
      const batchSize = 50;

      // Step 2: Re-fetch from EKAP and compare (month by month)
      const now = new Date();
      for (let daysBack = 0; daysBack < 30; daysBack += 7) {
        const end = new Date(now.getTime() - daysBack * 86400000);
        const start = new Date(end.getTime() - 7 * 86400000);

        let page = 1;
        let hasMore = true;

        while (hasMore) {
          const response = await ekapProvider.searchTenders({
            ihaleTarihBaslangic: start.toISOString().split("T")[0],
            ihaleTarihBitis: end.toISOString().split("T")[0],
            sayfaNo: page,
            sayfaBoyutu: batchSize,
          });

          if (response.list.length === 0) {
            hasMore = false;
            break;
          }

          const { updated: u } = await ekapProvider.batchUpsert(response.list);
          updated += u;

          if (page * batchSize >= response.totalCount) {
            hasMore = false;
          }
          page++;

          // Safety limit per week chunk
          if (page > 100) break;
        }
      }

      // Step 3: Check for status changes on open tenders
      const openTenders = dbTenders.filter(
        (t) => t.status === "BASVURU_ACIK" || t.status === "YAKLASAN",
      );

      for (const tender of openTenders.slice(0, 200)) {
        if (!tender.ekapNo) continue;

        const parts = tender.ekapNo.split("/");
        if (parts.length !== 2) continue;

        const iknYili = parseInt(parts[0], 10);
        const iknSayi = parseInt(parts[1], 10);
        if (isNaN(iknYili) || isNaN(iknSayi)) continue;

        try {
          const detail = await ekapProvider.getTenderDetail(iknSayi);
          if (!detail) continue;

          // Status changed in EKAP but not in DB
          const ekapStatus = detail.ihaleDurumId;
          const statusMap: Record<number, string> = {
            1: "BASVURU_ACIK", 2: "DEGERLENDIRME",
            3: "SONUCLANDI", 4: "IPTAL", 5: "YAKLASAN",
          };
          const newStatus = ekapStatus ? statusMap[ekapStatus] : null;

          if (newStatus && newStatus !== tender.status) {
            await prisma.tender.update({
              where: { id: tender.id },
              data: { status: newStatus as "BASVURU_ACIK" | "DEGERLENDIRME" | "SONUCLANDI" | "IPTAL" | "YAKLASAN" },
            });
            updated++;
          }
        } catch {
          // Skip individual failures
        }
      }

      // Step 4: Detect orphan mock data (source=MOCK or null with ekapNo pattern 2026/10xxxx)
      const orphans = await prisma.tender.findMany({
        where: {
          OR: [
            { source: "MOCK" },
            {
              source: null,
              ekapNo: { startsWith: "2026/10" },
            },
          ],
        },
        select: { id: true },
      });

      if (orphans.length > 0) {
        // Soft delete: mark as featured=false instead of hard delete
        await prisma.tender.updateMany({
          where: { id: { in: orphans.map((o) => o.id) } },
          data: { isFeatured: false },
        });
        orphansRemoved = orphans.length;
      }

      return updated + orphansRemoved;
    });

    return NextResponse.json({
      success: result.status === "COMPLETED",
      mode: "reconciliation",
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Reconciliation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
