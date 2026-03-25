import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getOrCalculateMyScore } from "@/lib/financial-health";

export async function GET() {
  try {
    const user = await requireAuth();
    if (!user.companyId) {
      return NextResponse.json({ error: "Firma kaydınız bulunmuyor" }, { status: 400 });
    }

    const score = await getOrCalculateMyScore(user.companyId);
    return NextResponse.json(score);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Hata";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
