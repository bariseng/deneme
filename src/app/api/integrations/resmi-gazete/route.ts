import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { resmiGazeteProvider } from "@/lib/providers/resmi-gazete-provider";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const sp = request.nextUrl.searchParams;
    const action = sp.get("action");

    if (action === "sync") {
      const [gazetteCount, kikCount, decisionsCount] = await Promise.all([
        resmiGazeteProvider.syncDailyGazette(sp.get("date") ?? undefined),
        resmiGazeteProvider.syncKikAnnouncements(),
        resmiGazeteProvider.syncKikDecisions(),
      ]);

      return NextResponse.json({
        success: true,
        gazette: gazetteCount,
        kikAnnouncements: kikCount,
        kikDecisions: decisionsCount,
        total: gazetteCount + kikCount + decisionsCount,
      });
    }

    if (action === "daily") {
      const entries = await resmiGazeteProvider.fetchDailyGazette(
        sp.get("date") ?? undefined,
      );
      return NextResponse.json({ entries, count: entries.length });
    }

    // Default: fetch today's gazette
    const entries = await resmiGazeteProvider.fetchDailyGazette();
    return NextResponse.json({ entries, count: entries.length });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Hata";
    if (msg === "UNAUTHORIZED")
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
