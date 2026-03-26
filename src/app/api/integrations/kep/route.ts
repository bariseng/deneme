import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  sendKepMessage,
  getMessageStatus,
  getInbox,
  getOutbox,
  getDeliveryReceipt,
  type KepSendRequest,
} from "@/lib/services/kep-provider";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = request.nextUrl;
    const action = searchParams.get("action");

    switch (action) {
      case "inbox": {
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const result = await getInbox(page, limit);
        return NextResponse.json({ success: true, data: result });
      }

      case "outbox": {
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const result = await getOutbox(page, limit);
        return NextResponse.json({ success: true, data: result });
      }

      case "status": {
        const messageId = searchParams.get("messageId");
        if (!messageId) return NextResponse.json({ error: "messageId gerekli" }, { status: 400 });
        const status = await getMessageStatus(messageId);
        if (!status) return NextResponse.json({ error: "Mesaj bulunamadı" }, { status: 404 });
        return NextResponse.json({ success: true, data: status });
      }

      case "receipt": {
        const messageId = searchParams.get("messageId");
        if (!messageId) return NextResponse.json({ error: "messageId gerekli" }, { status: 400 });
        const receipt = await getDeliveryReceipt(messageId);
        if (!receipt) return NextResponse.json({ error: "Teslim alındı belgesi bulunamadı" }, { status: 404 });
        return new NextResponse(new Uint8Array(receipt), {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="kep-receipt-${messageId}.pdf"`,
          },
        });
      }

      default:
        return NextResponse.json(
          { error: "Geçersiz action. Geçerli: inbox, outbox, status, receipt" },
          { status: 400 },
        );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "KEP hatası";
    if (message === "UNAUTHORIZED") return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();

    const { to, subject, body: messageBody, attachments, tenderId, priority } = body;
    if (!to || !Array.isArray(to) || to.length === 0 || !subject || !messageBody) {
      return NextResponse.json(
        { error: "to (array), subject ve body gerekli" },
        { status: 400 },
      );
    }

    const sendRequest: KepSendRequest = {
      to,
      subject,
      body: messageBody,
      attachments,
      tenderId,
      priority,
    };

    const message = await sendKepMessage(sendRequest);
    return NextResponse.json({ success: true, data: message }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "KEP gönderim hatası";
    if (message === "UNAUTHORIZED") return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
