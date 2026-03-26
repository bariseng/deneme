import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getInternationalTenders, seedInternationalData } from "@/lib/international";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { tedProvider } from "@/lib/providers/ted-provider";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const sp = request.nextUrl.searchParams;

    if (sp.get("action") === "seed") {
      const result = await seedInternationalData();
      return NextResponse.json(result);
    }

    // When TED real data is enabled, sync fresh data before serving
    if (isFeatureEnabled("USE_REAL_TED_DATA")) {
      try {
        const country = sp.get("country") || undefined;
        const tedData = await tedProvider.searchNotices({
          country: country || "TUR",
          pageSize: 20,
        });
        if (tedData.notices.length > 0) {
          void tedProvider.batchUpsert(tedData.notices).catch(() => {});
        }
      } catch {
        // Fallback to DB — TED unavailable
      }
    }

    const data = await getInternationalTenders({
      country: sp.get("country") || undefined,
      sector: sp.get("sector") || undefined,
      status: sp.get("status") || undefined,
      minBudget: sp.get("minBudget") ? parseFloat(sp.get("minBudget")!) : undefined,
      maxBudget: sp.get("maxBudget") ? parseFloat(sp.get("maxBudget")!) : undefined,
      page: sp.get("page") ? parseInt(sp.get("page")!) : 1,
      limit: sp.get("limit") ? parseInt(sp.get("limit")!) : 20,
    });

    return NextResponse.json(data);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Hata";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
