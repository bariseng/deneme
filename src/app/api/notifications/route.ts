import { NextRequest, NextResponse } from "next/server";
import { emailService } from "@/lib/integrations/email";

/**
 * POST /api/notifications
 * Send email notification
 *
 * Body: { to, tenderTitle, tenderId, type }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, tenderTitle, tenderId, type } = body;

    if (!to || !tenderTitle || !tenderId || !type) {
      return NextResponse.json(
        { success: false, error: "Eksik parametreler: to, tenderTitle, tenderId, type gerekli" },
        { status: 400 }
      );
    }

    const validTypes = ["new", "deadline", "amendment", "result"] as const;
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: "Geçersiz bildirim tipi" },
        { status: 400 }
      );
    }

    const result = await emailService.sendTenderNotification(to, tenderTitle, tenderId, type);

    return NextResponse.json({
      success: result.success,
      data: { messageId: result.messageId },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "E-posta gönderim hatası" },
      { status: 500 }
    );
  }
}
