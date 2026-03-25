import { NextRequest, NextResponse } from "next/server";
import { paymentService, type PaymentWebhookEvent } from "@/lib/integrations/payment";

/**
 * POST /api/payments/webhook
 * Handle payment provider webhook events (iyzico/Stripe)
 */
export async function POST(request: NextRequest) {
  try {
    // In production: verify webhook signature
    // const signature = request.headers.get("x-webhook-signature");
    // verifySignature(signature, body, WEBHOOK_SECRET);

    const event = (await request.json()) as PaymentWebhookEvent;

    if (!event.type || !event.sessionId) {
      return NextResponse.json(
        { success: false, error: "Geçersiz webhook verisi" },
        { status: 400 }
      );
    }

    await paymentService.handleWebhook(event);

    return NextResponse.json({ success: true, received: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Webhook hatası" },
      { status: 500 }
    );
  }
}
