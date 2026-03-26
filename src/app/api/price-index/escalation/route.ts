import { NextRequest, NextResponse } from "next/server";
import { calculatePriceEscalation } from "@/lib/services/price-index";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const baseMonth = searchParams.get("base");
    const currentMonth = searchParams.get("current");
    const indexCode = searchParams.get("index") || "YIUFE";

    if (!baseMonth || !currentMonth) {
      return NextResponse.json(
        { error: "base ve current parametreleri gerekli (YYYY-MM formatında)" },
        { status: 400 },
      );
    }

    const result = await calculatePriceEscalation(baseMonth, currentMonth, indexCode);

    if (!result) {
      return NextResponse.json(
        { error: "Belirtilen dönemler için endeks verisi bulunamadı" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Sunucu hatası";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
