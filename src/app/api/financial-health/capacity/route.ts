import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getCapacityAnalysis } from "@/lib/financial-health";

export async function GET() {
  try {
    const user = await requireAuth();
    if (!user.companyId) {
      return NextResponse.json({ error: "Firma kaydınız bulunmuyor" }, { status: 400 });
    }

    const analysis = await getCapacityAnalysis(user.companyId);
    return NextResponse.json(analysis);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Hata";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
