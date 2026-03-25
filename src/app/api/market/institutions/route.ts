import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getInstitutionSpending } from "@/lib/market-intelligence";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const limit = Number(request.nextUrl.searchParams.get("limit") || "10");
    const data = await getInstitutionSpending(limit);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kurum verileri alınamadı";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
