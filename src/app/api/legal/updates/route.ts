import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getLegalUpdates, getLegalStats, runLegalScan } from "@/lib/legal-scanner";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { mevzuatProvider } from "@/lib/providers/mevzuat-provider";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const sp = request.nextUrl.searchParams;
    const action = sp.get("action");

    if (action === "seed") {
      const results = await runLegalScan();
      return NextResponse.json({ seeded: results.total });
    }

    // When real legal data is enabled, sync tracked laws from mevzuat.gov.tr
    if (isFeatureEnabled("USE_REAL_LEGAL_DATA") && action === "sync") {
      const [lawCount, regCount] = await Promise.all([
        mevzuatProvider.syncTrackedLaws(),
        mevzuatProvider.syncTrackedRegulations(),
      ]);
      return NextResponse.json({ success: true, laws: lawCount, regulations: regCount });
    }

    if (action === "stats") {
      const stats = await getLegalStats();
      return NextResponse.json(stats);
    }

    const data = await getLegalUpdates({
      category: sp.get("category") || undefined,
      impactLevel: sp.get("impactLevel") || undefined,
      source: sp.get("source") || undefined,
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
