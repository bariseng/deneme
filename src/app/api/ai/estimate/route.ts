import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { useAICredit } from "@/lib/quota";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }

    // AI credit check
    const credit = await useAICredit(user.id, "estimate", "Fiyat Tahmini");
    if (!credit.success) {
      return NextResponse.json(
        { error: credit.message, upgradeRequired: true },
        { status: 403 }
      );
    }

    const { tenderId } = await request.json();
    if (!tenderId) {
      return NextResponse.json({ error: "İhale ID zorunludur" }, { status: 400 });
    }

    const tender = await prisma.tender.findUnique({
      where: { id: tenderId },
    });

    if (!tender) {
      return NextResponse.json({ error: "İhale bulunamadı" }, { status: 404 });
    }

    // Benzer ihalelerin sonuçlarını analiz et
    const similarResults = await prisma.tenderResult.findMany({
      where: {
        tender: {
          tenderType: tender.tenderType,
          city: tender.city,
        },
      },
      take: 10,
      orderBy: { resultDate: "desc" },
    });

    const estimated = Number(tender.estimatedCost) || 1000000;
    let avgDiscount = 0.85;

    if (similarResults.length > 0) {
      const discounts = similarResults.map((r) => {
        const resultTenderCost = estimated;
        return Number(r.winnerAmount) / resultTenderCost;
      });
      avgDiscount = discounts.reduce((a, b) => a + b, 0) / discounts.length;
      if (avgDiscount > 1) avgDiscount = 0.85;
    }

    const recommended = Math.round(estimated * avgDiscount);
    const min = Math.round(estimated * (avgDiscount - 0.1));
    const max = Math.round(estimated * (avgDiscount + 0.05));

    return NextResponse.json({
      success: true,
      data: {
        tenderId,
        estimatedCost: estimated,
        recommendation: {
          min,
          recommended,
          max,
          confidence: similarResults.length > 3 ? 0.85 : 0.65,
        },
        basedOn: {
          similarTenderCount: similarResults.length,
          avgDiscount: Math.round(avgDiscount * 100),
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Fiyat tahmini yapılamadı";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
