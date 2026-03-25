import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getLegalUpdates, getLegalStats, runLegalScan } from "@/lib/legal-scanner";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const sp = request.nextUrl.searchParams;
    const action = sp.get("action");

    if (action === "seed") {
      const results = await runLegalScan();
      return NextResponse.json({ seeded: results.length });
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
