import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { runSimulation, type SimulationParams } from "@/lib/bid-optimizer/cost-simulator";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }

    const { bidId, params } = await request.json() as {
      bidId?: string;
      params: SimulationParams;
    };

    if (!params || typeof params.baseAmount !== "number") {
      return NextResponse.json({ error: "Simülasyon parametreleri zorunludur" }, { status: 400 });
    }

    const result = runSimulation(params);

    // Persist simulation if linked to a bid
    if (bidId) {
      const scenarioParts: string[] = [];
      if (params.kdvIncluded) scenarioParts.push("kdv_dahil");
      if (params.transportEnabled) scenarioParts.push("nakliye");
      if (params.profitMarginEnabled) scenarioParts.push(`kar_${params.profitMarginPercent}`);
      if (params.discountEnabled) scenarioParts.push(`iskonto_${params.discountPercent}`);
      if (params.insuranceEnabled) scenarioParts.push(`sigorta_${params.insurancePercent}`);

      await prisma.bidSimulation.create({
        data: {
          bidId,
          userId: user.id,
          scenario: scenarioParts.join("+") || "base",
          parameters: JSON.parse(JSON.stringify(params)),
          baseAmount: params.baseAmount,
          finalAmount: result.finalAmount,
          breakdown: JSON.parse(JSON.stringify(result.breakdown)),
        },
      });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Simülasyon yapılamadı";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
