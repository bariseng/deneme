import { NextRequest, NextResponse } from "next/server";
import { paymentService, type PlanId } from "@/lib/integrations/payment";
import { getCurrentUser } from "@/lib/auth";

/**
 * POST /api/payments
 * Create a payment checkout session
 *
 * Body: { planId, billingPeriod }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Giriş yapmanız gerekiyor" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { planId, billingPeriod } = body;

    if (!planId || !billingPeriod) {
      return NextResponse.json(
        { success: false, error: "planId ve billingPeriod gerekli" },
        { status: 400 }
      );
    }

    const session = await paymentService.createCheckout(
      planId as PlanId,
      billingPeriod,
      user.id
    );

    return NextResponse.json({ success: true, data: session });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Ödeme hatası" },
      { status: 500 }
    );
  }
}
