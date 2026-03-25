import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { detectConflicts } from "@/lib/calendar-engine";

export async function GET() {
  try {
    const user = await requireAuth();
    const conflicts = await detectConflicts(user.id);
    return NextResponse.json(conflicts);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Hata";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
