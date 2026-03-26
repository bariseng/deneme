import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { reportContent, getReportReasons } from "@/lib/services/forum-search";

/**
 * GET /api/forum/report — Get available report reasons
 * POST /api/forum/report — Report content
 */
export async function GET() {
  return NextResponse.json({ reasons: getReportReasons() });
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { contentType, contentId, reason, details } = await request.json();

    if (!contentType || !contentId || !reason) {
      return NextResponse.json({ error: "contentType, contentId ve reason zorunludur" }, { status: 400 });
    }

    const result = await reportContent({
      reporterId: user.id,
      contentType,
      contentId,
      reason,
      details,
    });

    return NextResponse.json({ success: result.success });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Raporlama hatası";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
