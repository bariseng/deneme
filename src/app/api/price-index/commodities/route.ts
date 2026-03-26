import { NextRequest, NextResponse } from "next/server";
import { tobbProvider } from "@/lib/providers/tobb-provider";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const code = searchParams.get("code") || undefined;
    const city = searchParams.get("city") || undefined;
    const days = parseInt(searchParams.get("days") || "30");

    if (action === "seed") {
      const count = await tobbProvider.seedSampleCommodities();
      return NextResponse.json({ success: true, count });
    }

    if (action === "sync") {
      const count = await tobbProvider.syncCommodityPrices();
      return NextResponse.json({ success: true, count });
    }

    if (code) {
      const history = await tobbProvider.getCommodityHistory(code, days);
      return NextResponse.json({ success: true, data: history });
    }

    const data = await tobbProvider.fetchCommodityPrices({ city });
    return NextResponse.json({ success: true, data, count: data.length });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Sunucu hatası";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
