import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/notifications/preferences — Get user notification preferences
 * PUT /api/notifications/preferences — Update preferences
 */

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const rules = await prisma.notificationRule.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    // Get push subscription status
    const pushSubs = await prisma.pushSubscription.count({
      where: { userId: user.id },
    });

    return NextResponse.json({
      success: true,
      data: {
        rules,
        pushEnabled: pushSubs > 0,
        channels: {
          email: rules.some((r) => r.emailNotify) || rules.length === 0,
          push: rules.some((r) => r.pushNotify) || pushSubs > 0,
          sms: false, // Opt-in required
          whatsapp: false, // Opt-in required
        },
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Hata";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const body = await request.json();
    const { emailNotify, pushNotify, smsNotify, whatsappNotify, quietHoursStart, quietHoursEnd } = body;

    // Update all active rules with new channel preferences
    await prisma.notificationRule.updateMany({
      where: { userId: user.id },
      data: {
        emailNotify: emailNotify ?? undefined,
        pushNotify: pushNotify ?? undefined,
      },
    });

    // If no rules exist, create a default one
    const ruleCount = await prisma.notificationRule.count({
      where: { userId: user.id },
    });

    if (ruleCount === 0) {
      await prisma.notificationRule.create({
        data: {
          userId: user.id,
          name: "Varsayılan Bildirim Kuralı",
          isActive: true,
          emailNotify: emailNotify ?? true,
          pushNotify: pushNotify ?? false,
          cities: [],
          keywords: [],
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        emailNotify: emailNotify ?? true,
        pushNotify: pushNotify ?? false,
        smsNotify: smsNotify ?? false,
        whatsappNotify: whatsappNotify ?? false,
        quietHoursStart,
        quietHoursEnd,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Tercihler güncellenemedi";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
