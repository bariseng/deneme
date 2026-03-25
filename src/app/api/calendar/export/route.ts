import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { exportToIcs } from "@/lib/calendar-engine";
import ical, { ICalCalendarMethod } from "ical-generator";

export async function GET() {
  try {
    const user = await requireAuth();
    const events = await exportToIcs(user.id);

    const calendar = ical({
      name: "İhalePro Takvim",
      method: ICalCalendarMethod.PUBLISH,
    });

    for (const evt of events) {
      calendar.createEvent({
        id: evt.id,
        start: evt.startDate,
        end: evt.endDate || evt.startDate,
        summary: evt.title,
        description: evt.description || "",
      });
    }

    const icsContent = calendar.toString();

    return new NextResponse(icsContent, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": "attachment; filename=ihalepro-takvim.ics",
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Hata";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
