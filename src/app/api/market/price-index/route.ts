import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getPriceIndex, seedPriceIndex } from "@/lib/market-intelligence";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const sector = request.nextUrl.searchParams.get("sector") || undefined;
    const data = await getPriceIndex(sector);

    // Auto-seed if empty
    if (data.length === 0) {
      await seedPriceIndex();
      const seeded = await getPriceIndex(sector);
      return NextResponse.json({ success: true, data: seeded });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Fiyat endeksi alınamadı";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
