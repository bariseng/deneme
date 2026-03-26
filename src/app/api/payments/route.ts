import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  createCheckoutForm,
  getPlanById,
  PRICING_PLANS,
  type PlanId,
} from "@/lib/services/payment";

/**
 * POST /api/payments — Start iyzico checkout (3D Secure)
 * Body: { planId, billingPeriod, callbackUrl? }
 *
 * GET /api/payments — List user's payment history
 */

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }

    const body = await request.json();
    const { planId, billingPeriod } = body;

    if (!planId || !billingPeriod) {
      return NextResponse.json({ error: "planId ve billingPeriod gerekli" }, { status: 400 });
    }

    const plan = getPlanById(planId as PlanId);
    if (!plan || plan.id === "free") {
      return NextResponse.json({ error: "Geçersiz plan" }, { status: 400 });
    }

    // Determine callback URL
    const origin = request.headers.get("origin") || request.nextUrl.origin;
    const callbackUrl = body.callbackUrl || `${origin}/api/payments/callback`;

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip")
      || "127.0.0.1";

    const nameParts = (user.name || "İhale Kullanıcı").split(" ");
    const firstName = nameParts[0] || "İhale";
    const lastName = nameParts.slice(1).join(" ") || "Kullanıcı";

    const result = await createCheckoutForm({
      planId: planId as PlanId,
      billingPeriod,
      userId: user.id,
      userName: firstName,
      userSurname: lastName,
      userEmail: user.email || "user@ihalepro.com",
      userPhone: undefined,
      userIp: ip,
      callbackUrl,
    });

    return NextResponse.json({
      success: true,
      data: {
        token: result.token,
        checkoutFormContent: result.checkoutFormContent,
        tokenExpireTime: result.tokenExpireTime,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Ödeme başlatılamadı";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const sp = request.nextUrl.searchParams;

    // Return pricing plans
    if (sp.get("action") === "plans") {
      return NextResponse.json({ success: true, data: PRICING_PLANS });
    }

    // Return user's payment history
    const { prisma } = await import("@/lib/prisma");
    const payments = await prisma.payment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ success: true, data: payments });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Hata";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
