import { NextRequest, NextResponse } from "next/server";
import { exchangeGoogleCode } from "@/lib/providers/google-calendar-provider";
import { upsertSync } from "@/lib/calendar-engine";

/**
 * GET /api/calendar/auth/google/callback
 * Google OAuth 2.0 callback handler
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
    const tokens = await exchangeGoogleCode(code);

    // Store tokens
    await upsertSync(stateData.userId, "GOOGLE", {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      syncEnabled: true,
    });

    return NextResponse.redirect(new URL("/takvim/ayarlar?success=google_connected", request.url));
  } catch (e: unknown) {
    console.error("Google OAuth callback error:", e);
    return NextResponse.redirect(new URL("/takvim/ayarlar?error=google_auth_failed", request.url));
  }
}
