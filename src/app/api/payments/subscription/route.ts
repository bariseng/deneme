import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PRICING_PLANS } from "@/lib/services/payment";

/**
 * GET /api/payments/subscription — Current subscription status
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id },
    });

    const currentPlan = PRICING_PLANS.find(
      (p) => p.id === (subscription?.plan.toLowerCase() || "free"),
    ) || PRICING_PLANS[0];

    return NextResponse.json({
      success: true,
      data: {
        plan: currentPlan,
        subscription: subscription
          ? {
              status: subscription.status,
              startDate: subscription.startDate,
              endDate: subscription.endDate,
              cancelledAt: subscription.cancelledAt,
            }
          : null,
        userPlan: user.plan,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Hata";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
