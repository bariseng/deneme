import { NextRequest, NextResponse } from "next/server";
import { getTrends, calculateTrend } from "@/lib/price-indexer";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sector = searchParams.get("sector") || undefined;
    const item = searchParams.get("item") || undefined;
    const period = parseInt(searchParams.get("period") || "12");

    if (item && sector) {
      const trend = await calculateTrend(sector, item, period);
      return NextResponse.json(trend);
    }

    const trends = await getTrends(sector);
    return NextResponse.json(trends);
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
