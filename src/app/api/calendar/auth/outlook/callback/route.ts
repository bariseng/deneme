import { NextRequest, NextResponse } from "next/server";
import { exchangeOutlookCode } from "@/lib/providers/outlook-calendar-provider";
import { upsertSync } from "@/lib/calendar-engine";

/**
 * GET /api/calendar/auth/outlook/callback
 * Microsoft OAuth 2.0 callback handler
 */
export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");

    if (!code || !state) {
      return NextResponse.redirect(new URL("/takvim/ayarlar?error=missing_params", request.url));
    }

    // Decode state
    let stateData: { userId: string; provider: string };
    try {
      stateData = JSON.parse(Buffer.from(state, "base64url").toString());
    } catch {
      return NextResponse.redirect(new URL("/takvim/ayarlar?error=invalid_state", request.url));
    }

    // Exchange code for tokens
    const tokens = await exchangeOutlookCode(code);

    // Store tokens
    await upsertSync(stateData.userId, "OUTLOOK", {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      syncEnabled: true,
    });

    return NextResponse.redirect(new URL("/takvim/ayarlar?success=outlook_connected", request.url));
  } catch (e: unknown) {
    console.error("Outlook OAuth callback error:", e);
    return NextResponse.redirect(new URL("/takvim/ayarlar?error=outlook_auth_failed", request.url));
  }
}
