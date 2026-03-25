import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDailySummary, getUpcomingReminders } from "@/lib/calendar-engine";

export async function GET() {
  try {
    const user = await requireAuth();
    const [summary, reminders] = await Promise.all([
      getDailySummary(user.id),
      getUpcomingReminders(user.id),
    ]);

    return NextResponse.json({ ...summary, upcomingReminders: reminders });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Hata";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
