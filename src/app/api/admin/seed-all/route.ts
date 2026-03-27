import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { resmiGazeteProvider } from "@/lib/providers/resmi-gazete-provider";
import { kapProvider } from "@/lib/providers/kap-provider";
import { mevzuatProvider } from "@/lib/providers/mevzuat-provider";
import { tedProvider } from "@/lib/providers/ted-provider";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/seed-all
 * Seeds all empty tables from live external APIs.
 * Requires auth. Pass ?force=true to re-seed even if data exists.
 */
export async function POST(request: NextRequest) {
  try {
    // In development, allow unauthenticated access for seeding
    if (process.env.NODE_ENV === "production") {
      await requireAuth();
    }

    const force = request.nextUrl.searchParams.get("force") === "true";
    const results: Record<string, { count: number; status: string }> = {};

    // 1) KAP — Company table
    const companyCount = await prisma.company.count();
    if (companyCount === 0 || force) {
      try {
        const kapResult = await kapProvider.syncFromKap();
        results.company = { count: kapResult.synced, status: "OK" };
      } catch (e) {
        results.company = { count: 0, status: e instanceof Error ? e.message : "FAIL" };
      }
    } else {
      results.company = { count: companyCount, status: "SKIP" };
    }

    // 2) Resmi Gazete → LegalUpdate
    const legalCount = await prisma.legalUpdate.count();
    if (legalCount === 0 || force) {
      try {
        const [gazette, kik, decisions] = await Promise.all([
          resmiGazeteProvider.syncDailyGazette(),
          resmiGazeteProvider.syncKikAnnouncements(),
          resmiGazeteProvider.syncKikDecisions(),
        ]);
        results.legalUpdate = { count: gazette + kik + decisions, status: "OK" };
      } catch (e) {
        results.legalUpdate = { count: 0, status: e instanceof Error ? e.message : "FAIL" };
      }
    } else {
      results.legalUpdate = { count: legalCount, status: "SKIP" };
    }

    // 3) Mevzuat 4734/4735 → LegalUpdate (sync tracked laws)
    try {
      const [lawCount, regCount] = await Promise.all([
        mevzuatProvider.syncTrackedLaws(),
        mevzuatProvider.syncTrackedRegulations(),
      ]);
      results.mevzuat = { count: lawCount + regCount, status: "OK" };
    } catch (e) {
      results.mevzuat = { count: 0, status: e instanceof Error ? e.message : "FAIL" };
    }

    // 4) MacroPriceIndex (TCMB EVDS — requires TCMB_EVDS_KEY)
    const macroCount = await prisma.macroPriceIndex.count();
    if (macroCount === 0 || force) {
      if (process.env.TCMB_EVDS_KEY) {
        try {
          const { tuikProvider } = await import("@/lib/providers/tuik-provider");
          const count = await tuikProvider.syncMacroIndices();
          results.macroPriceIndex = { count, status: "OK" };
        } catch (e) {
          results.macroPriceIndex = { count: 0, status: e instanceof Error ? e.message : "FAIL" };
        }
      } else {
        results.macroPriceIndex = { count: 0, status: "TCMB_EVDS_KEY missing" };
      }
    } else {
      results.macroPriceIndex = { count: macroCount, status: "SKIP" };
    }

    // 5) InternationalTender — TED API (no key required)
    const intlCount = await prisma.internationalTender.count();
    if (intlCount === 0 || force) {
      try {
        const tedResult = await tedProvider.syncConstructionTenders(90);
        results.internationalTender = {
          count: tedResult.inserted + tedResult.updated,
          status: `OK (${tedResult.inserted} new, ${tedResult.updated} updated, ${tedResult.errors} errors)`,
        };
      } catch (e) {
        results.internationalTender = { count: 0, status: e instanceof Error ? e.message : "FAIL" };
      }
    } else {
      results.internationalTender = { count: intlCount, status: "SKIP" };
    }

    // 6) SectorStats — generate from existing Tender data
    const sectorCount = await prisma.sectorStats.count();
    if (sectorCount === 0 || force) {
      try {
        const count = await generateSectorStats();
        results.sectorStats = { count, status: "OK" };
      } catch (e) {
        results.sectorStats = { count: 0, status: e instanceof Error ? e.message : "FAIL" };
      }
    } else {
      results.sectorStats = { count: sectorCount, status: "SKIP" };
    }

    // 6) DailyStats — update from Tender data
    const dailyCount = await prisma.dailyStats.count();
    results.dailyStats = { count: dailyCount, status: dailyCount > 0 ? "EXISTING" : "EMPTY" };

    return NextResponse.json({ success: true, results });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Hata";
    if (msg === "UNAUTHORIZED")
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** Generate SectorStats aggregation from Tender table */
async function generateSectorStats(): Promise<number> {
  const raw = await prisma.$queryRaw<
    Array<{
      tenderType: string;
      month: string;
      count: number;
      totalBudget: number;
      avgBudget: number;
    }>
  >`
    SELECT
      "tenderType"::text as "tenderType",
      to_char("publishDate", 'YYYY-MM') as month,
      COUNT(id)::int as count,
      COALESCE(SUM("estimatedCost"), 0)::float as "totalBudget",
      COALESCE(AVG("estimatedCost"), 0)::float as "avgBudget"
    FROM "Tender"
    WHERE "publishDate" IS NOT NULL AND "tenderType" IS NOT NULL
    GROUP BY "tenderType", to_char("publishDate", 'YYYY-MM')
    ORDER BY month DESC
  `;

  let inserted = 0;
  for (const row of raw) {
    try {
      await prisma.sectorStats.upsert({
        where: {
          month_sector: {
            month: row.month,
            sector: row.tenderType,
          },
        },
        update: {
          tenderCount: row.count,
          totalBudget: row.totalBudget,
          avgBudget: row.avgBudget,
        },
        create: {
          month: row.month,
          sector: row.tenderType,
          tenderCount: row.count,
          totalBudget: row.totalBudget,
          avgBudget: row.avgBudget,
        },
      });
      inserted++;
    } catch {
      // skip duplicate
    }
  }

  return inserted;
}

export async function GET() {
  return NextResponse.json({
    usage: "POST /api/admin/seed-all — Seeds empty tables from live APIs",
    params: "?force=true to re-seed even if data exists",
  });
}
