import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { analyzeBenchmark } from "@/lib/bid-optimizer/benchmark-engine";
import { calculateWinProbability } from "@/lib/bid-optimizer/win-probability";
import { calculateBidScore } from "@/lib/bid-optimizer/bid-scorer";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }

    const { tenderId, items, totalAmount } = await request.json();

    if (!tenderId) {
      return NextResponse.json({ error: "İhale ID zorunludur" }, { status: 400 });
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

    const estimatedCost = tender.estimatedCost ? Number(tender.estimatedCost) : 10_000_000;
    const competitorCount = tender._count.applications || 5;
    const bidTotal = totalAmount || 0;

    // 1. Benchmark analysis
    const benchmarks = items?.length
      ? analyzeBenchmark(items, tender.tenderType)
      : [];

    // 2. Win probability curve
    const winAnalysis = calculateWinProbability(
      estimatedCost,
      tender.tenderType,
      competitorCount
    );

    // 3. Bid score
    const bidScore = calculateBidScore({
      totalAmount: bidTotal,
      estimatedCost,
      benchmarks,
      winAnalysis,
      itemCount: items?.length || 0,
      hasLetter: true, // assume from client
      hasCompanyInfo: true,
    });

    // Persist win probability data
    if (bidTotal > 0) {
      // Find closest probability point
      let closestProb = winAnalysis.curve[0];
      let minDiff = Math.abs(winAnalysis.curve[0].bidAmount - bidTotal);
      for (const p of winAnalysis.curve) {
        const diff = Math.abs(p.bidAmount - bidTotal);
        if (diff < minDiff) {
          minDiff = diff;
          closestProb = p;
        }
      }

      await prisma.winProbability.create({
        data: {
          tenderId,
          userId: user.id,
          bidAmount: bidTotal,
          probability: closestProb.probability,
          competitorEst: competitorCount,
          analysisData: {
            historicalData: winAnalysis.historicalData,
            bidScore: bidScore.overall,
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        benchmarks,
        winAnalysis,
        bidScore,
        estimatedCost,
        competitorCount,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Optimizasyon yapılamadı";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
