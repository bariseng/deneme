import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { generateMarketReport } from "@/lib/services/market-intelligence";

/**
 * GET /api/market/report
 * Pazar istihbarat raporu
 * Query params: sectors (comma-sep), cities (comma-sep), period (days)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const sectorsParam = searchParams.get("sectors");
    const citiesParam = searchParams.get("cities");
    const periodParam = searchParams.get("period");

    const report = await generateMarketReport(user.id, {
      sectors: sectorsParam ? sectorsParam.split(",").map((s) => s.trim()) : undefined,
      cities: citiesParam ? citiesParam.split(",").map((c) => c.trim()) : undefined,
      period: periodParam ? parseInt(periodParam, 10) : 30,
    });

    return NextResponse.json({ success: true, report });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Rapor hatası";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
