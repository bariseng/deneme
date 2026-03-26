import { NextRequest, NextResponse } from "next/server";
import { unitPriceProvider } from "@/lib/providers/unit-price-provider";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const category = searchParams.get("category") || undefined;
    const source = searchParams.get("source") || undefined;
    const year = searchParams.get("year")
      ? parseInt(searchParams.get("year")!)
      : undefined;
    const search = searchParams.get("q") || undefined;
    const code = searchParams.get("code") || undefined;

    if (action === "seed") {
      const count = await unitPriceProvider.seedSampleUnitPrices();
      return NextResponse.json({ success: true, count });
    }

    if (action === "check-updates") {
      const updates = await unitPriceProvider.checkForUpdates();
      return NextResponse.json(updates);
    }

    if (code) {
      const data = await unitPriceProvider.getUnitPriceByCode(code, year);
      if (!data) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
      return NextResponse.json(data);
    }

    const data = await unitPriceProvider.getLatestUnitPrices({
      category, source, year, search,
    });
    return NextResponse.json({ success: true, data, count: data.length });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Sunucu hatası";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
