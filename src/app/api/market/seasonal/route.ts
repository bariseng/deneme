import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSeasonalPatterns } from "@/lib/market-intelligence";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const sector = request.nextUrl.searchParams.get("sector") || undefined;
    const data = await getSeasonalPatterns(sector);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Mevsimsel veriler alınamadı";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
