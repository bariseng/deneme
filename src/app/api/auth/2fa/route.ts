import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  setup2FA,
  verify2FA,
  disable2FA,
  regenerateBackupCodes,
  is2FAEnabled,
} from "@/lib/security/two-factor";

/**
 * GET /api/auth/2fa — Check 2FA status
 * POST /api/auth/2fa — Setup/verify/disable/regenerate
 */
export async function GET() {
  try {
    const user = await requireAuth();
    const enabled = await is2FAEnabled(user.id);
    return NextResponse.json({ success: true, enabled });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "2FA hatası";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Giriş yapın" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { action, token } = await request.json();

    switch (action) {
      case "setup": {
        const result = await setup2FA(user.id);
        return NextResponse.json({
          success: true,
          qrCode: result.qrCodeDataUrl,
          backupCodes: result.backupCodes,
        });
      }

      case "verify": {
        if (!token) return NextResponse.json({ error: "Token gerekli" }, { status: 400 });
        const valid = await verify2FA(user.id, token);
        if (!valid) return NextResponse.json({ error: "Geçersiz kod" }, { status: 400 });
        return NextResponse.json({ success: true, message: "2FA aktif edildi" });
      }

      case "disable": {
        if (!token) return NextResponse.json({ error: "Token gerekli" }, { status: 400 });
        const disabled = await disable2FA(user.id, token);
        if (!disabled) return NextResponse.json({ error: "Geçersiz kod" }, { status: 400 });
        return NextResponse.json({ success: true, message: "2FA devre dışı bırakıldı" });
      }

      case "regenerate": {
        if (!token) return NextResponse.json({ error: "Token gerekli" }, { status: 400 });
        const codes = await regenerateBackupCodes(user.id, token);
        if (!codes) return NextResponse.json({ error: "Geçersiz kod" }, { status: 400 });
        return NextResponse.json({ success: true, backupCodes: codes });
      }

      default:
        return NextResponse.json({ error: "Geçersiz action" }, { status: 400 });
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "2FA hatası";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Giriş yapın" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
