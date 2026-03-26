import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTenderMatchEmail } from "@/lib/providers/email-provider";

/**
 * POST /api/cron/daily-digest
 * Sends daily digest emails with matching tenders
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get active notification rules with email enabled
    const rules = await prisma.notificationRule.findMany({
      where: { isActive: true, emailNotify: true },
      include: {
        user: { select: { id: true, email: true, name: true, plan: true } },
      },
    });

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    let emailsSent = 0;

    for (const rule of rules) {
      if (!rule.user.email) continue;
      // FREE plan: skip digest (upgrade incentive)
      if (rule.user.plan === "FREE") continue;

      // Build tender query from rule criteria
      const where: Record<string, unknown> = {
        createdAt: { gte: yesterday },
        status: "BASVURU_ACIK",
      };

      if (rule.cities.length > 0) where.city = { in: rule.cities };
      if (rule.tenderTypes.length > 0) where.tenderType = { in: rule.tenderTypes };
      if (rule.keywords.length > 0) {
        where.OR = rule.keywords.map((kw) => ({
          title: { contains: kw, mode: "insensitive" },
        }));
      }
      if (rule.budgetMin) where.estimatedCost = { gte: rule.budgetMin };
      if (rule.budgetMax) {
        where.estimatedCost = {
          ...(where.estimatedCost as Record<string, unknown> || {}),
          lte: rule.budgetMax,
        };
      }

      const tenders = await prisma.tender.findMany({
        where,
        select: {
          id: true,
          title: true,
          city: true,
          deadline: true,
          estimatedCost: true,
        },
        orderBy: { deadline: "asc" },
        take: 10,
      });

      if (tenders.length === 0) continue;

      const formatted = tenders.map((t) => ({
        id: t.id,
        title: t.title,
        city: t.city,
        deadline: t.deadline.toLocaleDateString("tr-TR"),
        budget: t.estimatedCost
          ? `₺${Number(t.estimatedCost).toLocaleString("tr-TR")}`
          : "Belirtilmemiş",
      }));

      const result = await sendTenderMatchEmail(rule.user.email, formatted);
      if (result.success) emailsSent++;
    }

    return NextResponse.json({
      success: true,
      emailsSent,
      rulesProcessed: rules.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Digest hatası";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
