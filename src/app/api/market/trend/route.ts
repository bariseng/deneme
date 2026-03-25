import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSectorTrends } from "@/lib/market-intelligence";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const months = Number(request.nextUrl.searchParams.get("months") || "3");
    const trends = await getSectorTrends(months);
    return NextResponse.json({ success: true, data: trends });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Trend verisi alınamadı";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
