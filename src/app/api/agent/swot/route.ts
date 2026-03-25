import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { useAICredit } from "@/lib/quota";
import { generateSWOT } from "@/lib/agent/swot-analyzer";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { tenderId } = await request.json();

    if (!tenderId) {
      return NextResponse.json({ error: "İhale ID zorunludur" }, { status: 400 });
    }

    // AI credit check
    if (user) {
      const credit = await useAICredit(user.id, "swot", "SWOT Analizi");
      if (!credit.success) {
        return NextResponse.json(
          { error: credit.message, upgradeRequired: true },
          { status: 403 }
        );
      }
    }

    const tender = await prisma.tender.findUnique({
      where: { id: tenderId },
      include: {
        _count: { select: { applications: true } },
      },
    });

    if (!tender) {
      return NextResponse.json({ error: "İhale bulunamadı" }, { status: 404 });
    }

    let profile = null;
    let pastWinRate = 20; // default

    if (user) {
      profile = await prisma.firmProfile.findUnique({
        where: { userId: user.id },
      });

      // Calculate past win rate from applications
      const totalApps = await prisma.application.count({
        where: { userId: user.id },
      });
      const wonApps = await prisma.application.count({
        where: { userId: user.id, status: "KABUL_EDILDI" },
      });
      if (totalApps > 0) {
        pastWinRate = Math.round((wonApps / totalApps) * 100);
      }
    }

    const swot = generateSWOT(
      tender,
      profile,
      tender._count.applications,
      pastWinRate
    );

    // Log task
    if (user) {
      await prisma.agentTask.create({
        data: {
          userId: user.id,
          type: "SWOT_ANALYSIS",
          status: "COMPLETED",
          input: { tenderId },
          output: {
            overallScore: swot.overallScore,
            recommendation: swot.recommendation,
          },
          startedAt: new Date(),
          completedAt: new Date(),
        },
      });
    }

    return NextResponse.json({ success: true, data: swot });
  } catch (error) {
    const message = error instanceof Error ? error.message : "SWOT analizi yapılamadı";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
