import { NextRequest, NextResponse } from "next/server";
import { paymentService, type PaymentWebhookEvent } from "@/lib/integrations/payment";
import { upgradePlan } from "@/lib/quota";
import { prisma } from "@/lib/prisma";

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

    // Handle subscription lifecycle
    const planMap: Record<string, string> = {
      pro: "PRO",
      enterprise: "ENTERPRISE",
    };

    switch (event.type) {
      case "payment.success": {
        const dbPlan = planMap[event.planId] || "PRO";
        await upgradePlan(event.userId, dbPlan);

        // Create/update subscription record
        await prisma.subscription.upsert({
          where: { userId: event.userId },
          create: {
            userId: event.userId,
            plan: dbPlan as "PRO" | "ENTERPRISE",
            status: "active",
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 86400000), // +30 days
          },
          update: {
            plan: dbPlan as "PRO" | "ENTERPRISE",
            status: "active",
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 86400000),
            cancelledAt: null,
          },
        });

        // Log payment
        await prisma.payment.create({
          data: {
            userId: event.userId,
            planId: event.planId,
            amount: event.amount,
            status: "completed",
            provider: "iyzico",
            providerTxId: event.sessionId,
          },
        });
        break;
      }

      case "subscription.cancelled": {
        await prisma.subscription.updateMany({
          where: { userId: event.userId, status: "active" },
          data: { status: "cancelled", cancelledAt: new Date() },
        });

        // Downgrade to free
        await upgradePlan(event.userId, "FREE");
        break;
      }

      case "subscription.renewed": {
        const renewPlan = planMap[event.planId] || "PRO";
        await upgradePlan(event.userId, renewPlan);

        await prisma.subscription.updateMany({
          where: { userId: event.userId },
          data: {
            status: "active",
            endDate: new Date(Date.now() + 30 * 86400000),
          },
        });

        await prisma.payment.create({
          data: {
            userId: event.userId,
            planId: event.planId,
            amount: event.amount,
            status: "completed",
            provider: "iyzico",
            providerTxId: event.sessionId,
            billingPeriod: "monthly",
          },
        });
        break;
      }
    }

    return NextResponse.json({ success: true, received: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Webhook hatası" },
      { status: 500 }
    );
  }
}
