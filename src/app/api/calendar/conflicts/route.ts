import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { detectAllConflicts } from "@/lib/services/conflict-detector";

/**
 * GET /api/calendar/conflicts
 * Enhanced conflict detection with recommendations
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const daysParam = request.nextUrl.searchParams.get("days");
    const days = daysParam ? parseInt(daysParam, 10) : 30;

    const summary = await detectAllConflicts(user.id, days);
    return NextResponse.json(summary);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Hata";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
