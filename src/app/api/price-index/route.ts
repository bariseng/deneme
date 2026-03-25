import { NextRequest, NextResponse } from "next/server";
import { getLatestPrices, getPriceIndex, getIndexStats, seedPriceIndex } from "@/lib/price-indexer";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const sector = searchParams.get("sector") || undefined;
    const item = searchParams.get("item") || undefined;
    const city = searchParams.get("city") || undefined;

    if (action === "seed") {
      await seedPriceIndex();
      return NextResponse.json({ success: true });
    }

    if (action === "stats") {
      const stats = await getIndexStats();
      return NextResponse.json(stats);
    }

    if (item || city) {
      const data = await getPriceIndex({ sector, item, city });
      return NextResponse.json(data);
    }

    const data = await getLatestPrices(sector);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
