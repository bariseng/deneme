import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { findMatches } from "@/lib/jv-matching";

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const { requestId } = await req.json();

    if (!requestId) {
      return NextResponse.json({ error: "requestId gerekli" }, { status: 400 });
    }

    const matches = await findMatches(requestId);
    return NextResponse.json({ matches, count: matches.length });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Oturum açın" }, { status: 401 });
    if (e instanceof Error && e.message === "İlan bulunamadı")
      return NextResponse.json({ error: e.message }, { status: 404 });
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
