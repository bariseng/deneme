import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getScoreById } from "@/lib/financial-health";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

    const score = await getScoreById(id);
    if (!score) return NextResponse.json({ error: "Skor bulunamadı" }, { status: 404 });

    return NextResponse.json(score);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Hata";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
