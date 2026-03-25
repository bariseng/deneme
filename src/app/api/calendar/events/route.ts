import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getCalendarEvents, createEvent } from "@/lib/calendar-engine";
import { CalendarEventType } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const sp = request.nextUrl.searchParams;

    const events = await getCalendarEvents(
      user.id,
      sp.get("from") || undefined,
      sp.get("to") || undefined,
    );

    return NextResponse.json(events);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Hata";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    if (!body.title || !body.startDate) {
      return NextResponse.json({ error: "Başlık ve başlangıç tarihi gereklidir" }, { status: 400 });
    }

    const event = await createEvent({
      userId: user.id,
      tenderId: body.tenderId,
      title: body.title,
      description: body.description,
      eventType: (body.eventType as CalendarEventType) || "OZEL",
      startDate: new Date(body.startDate),
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      reminderDays: body.reminderDays || [],
    });

    return NextResponse.json(event);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Hata";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
