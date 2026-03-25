import { NextRequest, NextResponse } from "next/server";
import { getRegionalComparison, getRegionalComparisons } from "@/lib/price-indexer";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const item = searchParams.get("item") || undefined;
    const sector = searchParams.get("sector") || undefined;

    if (item) {
      const data = await getRegionalComparison(item);
      if (!data) return NextResponse.json({ error: "Veri bulunamadı" }, { status: 404 });
      return NextResponse.json(data);
    }

    const data = await getRegionalComparisons(sector);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
