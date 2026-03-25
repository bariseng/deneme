import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { setup2FA, enable2FA, disable2FA, get2FAStatus } from "@/lib/security";

export async function GET() {
  try {
    const user = await requireAuth();
    const status = await get2FAStatus(user.id);
    return NextResponse.json({ success: true, data: status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "2FA durumu alınamadı";
    if (message === "UNAUTHORIZED") return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    if (body.action === "setup") {
      const result = await setup2FA(user.id);
      return NextResponse.json({ success: true, data: result });
    }

    if (body.action === "enable") {
      await enable2FA(user.id);
      return NextResponse.json({ success: true, message: "2FA etkinleştirildi" });
    }

    if (body.action === "disable") {
      await disable2FA(user.id);
      return NextResponse.json({ success: true, message: "2FA devre dışı bırakıldı" });
    }

    return NextResponse.json({ error: "Geçersiz işlem" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "2FA işlemi başarısız";
    if (message === "UNAUTHORIZED") return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
