import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { generateIcs, getOrCreateFeedToken, validateFeedToken, getFeedUrl } from "@/lib/services/calendar-export";

/**
 * GET /api/calendar/ics
 * Two modes:
 * 1. ?token=xxx → Public ICS feed (no auth, token-based)
 * 2. No token → Authenticated request, returns feed URL + ICS content
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  // Token-based access (for calendar subscription)
  if (token) {
    try {
      const userId = await validateFeedToken(token);
      if (!userId) {
        return new NextResponse("Geçersiz veya süresi dolmuş token", { status: 403 });
      }

      const icsContent = await generateIcs(userId, { includeReminders: true });
      return new NextResponse(icsContent, {
        headers: {
          "Content-Type": "text/calendar; charset=utf-8",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    } catch {
      return new NextResponse("ICS oluşturma hatası", { status: 500 });
    }
  }

  // Authenticated access — return feed URL
  try {
    const user = await requireAuth();
    const feedToken = await getOrCreateFeedToken(user.id);
    const feedUrl = getFeedUrl(feedToken);

    // Also return ICS content for direct download
    const icsContent = await generateIcs(user.id, { includeReminders: true });

    return NextResponse.json({
      feedUrl,
      feedToken,
      icsContent,
      instructions: {
        google: `Google Calendar'a eklemek için: Ayarlar → Diğer Takvimler → URL ile abone ol → ${feedUrl}`,
        outlook: `Outlook'a eklemek için: Takvim → Takvim Ekle → İnternet'ten abone ol → ${feedUrl}`,
        apple: `Apple Calendar: Dosya → Yeni Takvim Aboneliği → ${feedUrl}`,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Hata";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
