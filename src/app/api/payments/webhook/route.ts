import { NextRequest, NextResponse } from "next/server";
import {
  verifyIyzicoSignature,
  processWebhookEvent,
  type IyzicoWebhookPayload,
} from "@/lib/services/iyzico-webhook";

/**
 * POST /api/payments/webhook
 * iyzico webhook endpoint with IYZWSv2 signature verification
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    // IYZWSv2 signature verification
    const signature = request.headers.get("x-iyz-wsv2-signature")
      || request.headers.get("authorization")
      || "";

    const secretKey = process.env.IYZICO_SECRET_KEY;

    if (!secretKey) {
      return NextResponse.json({ error: "IYZICO_SECRET_KEY not configured" }, { status: 500 });
    }

    // Verify signature in production
    const isProd = process.env.IYZICO_BASE_URL === "https://api.iyzipay.com";
    if (isProd && !verifyIyzicoSignature(secretKey, signature, rawBody)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Parse payload
    let payload: IyzicoWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (!payload.iyziEventType) {
      return NextResponse.json({ error: "Missing iyziEventType" }, { status: 400 });
    }

    // Process event
    const result = await processWebhookEvent(payload);

    return NextResponse.json({
      success: result.success,
      action: result.action,
      details: result.details,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Webhook hatası";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
