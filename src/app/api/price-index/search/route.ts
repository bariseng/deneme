import { NextRequest, NextResponse } from "next/server";
import { searchPriceItems } from "@/lib/price-indexer";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const sector = searchParams.get("sector") || undefined;

    const results = await searchPriceItems(q, sector);
    return NextResponse.json(results);
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
