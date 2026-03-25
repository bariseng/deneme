import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    if (user.plan === "FREE") {
      return NextResponse.json(
        { error: "Doküman çevirisi premium üyelik gerektirir" },
        { status: 403 }
      );
    }

    const { text } = await request.json();
    if (!text) return NextResponse.json({ error: "Çevrilecek metin gerekli" }, { status: 400 });

    // Mock translation — in production would call AI API
    const translated = `[Türkçe Çeviri]\n\n${text}`;

    return NextResponse.json({ translated });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Hata";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
