import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { upsertSync, getSyncStatus } from "@/lib/calendar-engine";

export async function GET() {
  try {
    const user = await requireAuth();
    const syncs = await getSyncStatus(user.id);
    return NextResponse.json(syncs);
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

    // In production: handle OAuth callback, exchange code for tokens
    // For now: toggle sync status or store mock tokens
    const sync = await upsertSync(user.id, "GOOGLE", {
      accessToken: body.accessToken || "mock-access-token",
      refreshToken: body.refreshToken || "mock-refresh-token",
      syncEnabled: body.syncEnabled !== false,
    });

    return NextResponse.json(sync);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Hata";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
