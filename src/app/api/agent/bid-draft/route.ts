import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { useAICredit } from "@/lib/quota";
import { draftBid } from "@/lib/agent/bid-drafter";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { tenderId } = await request.json();

    if (!tenderId) {
      return NextResponse.json({ error: "İhale ID zorunludur" }, { status: 400 });
    }

    // AI credit check
    if (user) {
      const credit = await useAICredit(user.id, "bid_draft", "Teklif Taslağı");
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

    const draft = draftBid(tender, tender._count.applications);

    if (user) {
      await prisma.agentTask.create({
        data: {
          userId: user.id,
          type: "BID_DRAFT",
          status: "COMPLETED",
          input: { tenderId },
          output: {
            optimalBid: draft.optimalBid,
            winProbability: draft.winProbability,
          },
          startedAt: new Date(),
          completedAt: new Date(),
        },
      });
    }

    return NextResponse.json({ success: true, data: draft });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Teklif taslağı oluşturulamadı";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
