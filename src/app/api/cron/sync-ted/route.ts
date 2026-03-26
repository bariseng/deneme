import { NextRequest, NextResponse } from "next/server";
import { tedProvider, TARGET_COUNTRIES } from "@/lib/providers/ted-provider";

/**
 * POST /api/cron/sync-ted
 * TED uluslararası ihale senkronizasyonu — günde 2 kez (08:00, 18:00)
 *
 * Query params:
 *   country=DEU  — belirli ülke (opsiyonel, yoksa tüm hedef ülkeler)
 *
 * Header: Authorization: Bearer <CRON_SECRET>
 */
export async function POST(request: NextRequest) {
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
  const countryFilter = searchParams.get("country");

  try {
    const countries = countryFilter
      ? TARGET_COUNTRIES.filter((c) => c.code === countryFilter)
      : TARGET_COUNTRIES;

    const result = await tedProvider.logSync("sync_target_countries", async () => {
      let total = 0;

      for (const country of countries) {
        const response = await tedProvider.searchNotices({
          country: country.code,
          dateFrom: getDateDaysAgo(7),
          dateTo: todayStr(),
          pageSize: 50,
        });

        if (response.notices.length > 0) {
          const { inserted, updated } = await tedProvider.batchUpsert(
            response.notices,
          );
          total += inserted + updated;
        }
      }

      return total;
    });

    return NextResponse.json({
      success: result.status === "COMPLETED",
      countriesScanned: countries.length,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "TED sync failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function getDateDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}
