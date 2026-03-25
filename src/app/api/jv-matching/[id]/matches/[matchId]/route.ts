import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { updateMatchStatus } from "@/lib/jv-matching";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; matchId: string }> }
) {
  try {
    await requireAuth();
    const { matchId } = await params;
    const { status, message } = await req.json();

    if (!status || !["ACCEPTED", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "Geçersiz durum" }, { status: 400 });
    }

    const updated = await updateMatchStatus(matchId, status, message);
    return NextResponse.json(updated);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Oturum açın" }, { status: 401 });
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
