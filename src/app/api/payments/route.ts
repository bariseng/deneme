import { NextRequest, NextResponse } from "next/server";
import { paymentService, type PlanId } from "@/lib/integrations/payment";

/**
 * POST /api/payments
 * Create a payment checkout session
 *
 * Body: { planId, billingPeriod, userId }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { planId, billingPeriod, userId } = body;

    if (!planId || !billingPeriod) {
      return NextResponse.json(
        { success: false, error: "planId ve billingPeriod gerekli" },
        { status: 400 }
      );
    }

    const session = await paymentService.createCheckout(
      planId as PlanId,
      billingPeriod,
      userId || "demo-user"
    );

    return NextResponse.json({ success: true, data: session });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Ödeme hatası" },
      { status: 500 }
    );
  }
}
