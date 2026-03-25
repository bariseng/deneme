import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createWebhook, getUserWebhooks } from "@/lib/white-label";

export async function GET() {
  try {
    const user = await requireAuth();
    const webhooks = await getUserWebhooks(user.id);
    return NextResponse.json({ success: true, data: webhooks });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook'lar alınamadı";
    if (message === "UNAUTHORIZED") return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    if (!body.url || !body.events?.length) {
      return NextResponse.json({ error: "URL ve en az bir event gerekli" }, { status: 400 });
    }
    const webhook = await createWebhook(user.id, {
      url: body.url,
      events: body.events,
      tenantId: body.tenantId,
    });
    return NextResponse.json({ success: true, data: webhook }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook oluşturulamadı";
    if (message === "UNAUTHORIZED") return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
