import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getCompetitionDensity } from "@/lib/market-intelligence";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const city = request.nextUrl.searchParams.get("city") || undefined;
    const sector = request.nextUrl.searchParams.get("sector") || undefined;
    const data = await getCompetitionDensity(city, sector);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Rekabet verileri alınamadı";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
