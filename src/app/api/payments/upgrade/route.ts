import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createCheckoutForm, getPlanById, type PlanId } from "@/lib/services/payment";

/**
 * POST /api/payments/upgrade — Upgrade subscription plan
 * Body: { planId, billingPeriod }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const { planId, billingPeriod } = await request.json();

    if (!planId || !billingPeriod) {
      return NextResponse.json({ error: "planId ve billingPeriod gerekli" }, { status: 400 });
    }

    const plan = getPlanById(planId as PlanId);
    if (!plan || plan.id === "free") {
      return NextResponse.json({ error: "Geçersiz plan" }, { status: 400 });
    }

    // Check if downgrade — not allowed via this endpoint
    const currentPlanOrder = ["free", "basic", "pro", "enterprise"];
    const currentIdx = currentPlanOrder.indexOf(user.plan.toLowerCase());
    const newIdx = currentPlanOrder.indexOf(planId);

    if (newIdx <= currentIdx && currentIdx > 0) {
      return NextResponse.json(
        { error: "Plan düşürme için aboneliğinizi iptal edip yeniden abone olun" },
        { status: 400 },
      );
    }

    const origin = request.headers.get("origin") || request.nextUrl.origin;
    const callbackUrl = `${origin}/api/payments/callback`;
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const nameParts = (user.name || "İhale Kullanıcı").split(" ");

    const result = await createCheckoutForm({
      planId: planId as PlanId,
      billingPeriod,
      userId: user.id,
      userName: nameParts[0] || "İhale",
      userSurname: nameParts.slice(1).join(" ") || "Kullanıcı",
      userEmail: user.email || "user@ihalepro.com",
      userIp: ip,
      callbackUrl,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Yükseltme hatası";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
