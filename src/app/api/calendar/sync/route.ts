import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { syncWithGoogle, getGoogleAuthUrl } from "@/lib/providers/google-calendar-provider";
import { syncWithOutlook, getOutlookAuthUrl } from "@/lib/providers/outlook-calendar-provider";
import { getSyncStatus } from "@/lib/calendar-engine";

/**
 * GET /api/calendar/sync
 * Get sync status for all providers
 */
export async function GET() {
  try {
    const user = await requireAuth();
    const syncs = await getSyncStatus(user.id);
    return NextResponse.json({ syncs });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Hata";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * POST /api/calendar/sync
 * Start sync with a provider or get auth URL
 * Body: { provider: "GOOGLE" | "OUTLOOK", action: "sync" | "connect" }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { provider, action } = await request.json();

    if (!provider || !["GOOGLE", "OUTLOOK"].includes(provider)) {
      return NextResponse.json({ error: "Geçersiz provider" }, { status: 400 });
    }

    // Connect: return OAuth URL
    if (action === "connect") {
      const state = Buffer.from(JSON.stringify({ userId: user.id, provider })).toString("base64url");

      if (provider === "GOOGLE") {
        const url = getGoogleAuthUrl(state);
        return NextResponse.json({ authUrl: url });
      } else {
        const url = await getOutlookAuthUrl(state);
        return NextResponse.json({ authUrl: url });
      }
    }

    // Sync: run two-way sync
    if (provider === "GOOGLE") {
      const result = await syncWithGoogle(user.id);
      return NextResponse.json({ success: true, provider: "GOOGLE", ...result });
    } else {
      const result = await syncWithOutlook(user.id);
      return NextResponse.json({ success: true, provider: "OUTLOOK", ...result });
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Hata";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
