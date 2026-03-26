import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/notifications/unsubscribe?token=xxx
 * One-click email unsubscribe (RFC 8058)
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const userId = request.nextUrl.searchParams.get("userId");

  if (!userId) {
    return new NextResponse(
      `<html><body><h1>E-posta bildirimlerinden çıkmak için giriş yapın</h1>
       <a href="/ayarlar/bildirimler">Bildirim Ayarları</a></body></html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  try {
    // Disable email notifications for this user
    await prisma.notificationRule.updateMany({
      where: { userId },
      data: { emailNotify: false },
    });

    return new NextResponse(
      `<html><body style="font-family:sans-serif;text-align:center;padding:40px;">
       <h1>E-posta bildirimleri kapatıldı</h1>
       <p>Artık İhalePro'dan bildirim e-postası almayacaksınız.</p>
       <a href="/ayarlar/bildirimler">Bildirim ayarlarını yönet</a>
       </body></html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  } catch {
    return new NextResponse("Hata oluştu", { status: 500 });
  }
}
