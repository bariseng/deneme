import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { checkEligibility } from "@/lib/services/ai-analysis";
import { runMatchScan, updateFirmEmbedding, matchTendersForUser } from "@/lib/services/tender-agent";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/ai/match
 * İhale-firma eşleştirme
 * Actions: "scan" (full scan), "check" (single tender eligibility), "update-profile" (re-embed)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }

    const { action, tenderId } = await request.json();

    switch (action) {
      case "scan": {
        const result = await runMatchScan(user.id);
        return NextResponse.json({ success: true, ...result });
      }

      case "check": {
        if (!tenderId) {
          return NextResponse.json({ error: "İhale ID zorunludur" }, { status: 400 });
        }

        const tender = await prisma.tender.findUnique({
          where: { id: tenderId },
          select: {
            id: true,
            title: true,
            description: true,
            requirements: true,
            tenderType: true,
            estimatedCost: true,
            city: true,
            deadline: true,
            institution: true,
          },
        });

        if (!tender) {
          return NextResponse.json({ error: "İhale bulunamadı" }, { status: 404 });
        }

        const eligibility = await checkEligibility(user.id, {
          tenderId: tender.id,
          title: tender.title,
          description: tender.description || undefined,
          requirements: tender.requirements || undefined,
          tenderType: tender.tenderType || undefined,
          estimatedCost: tender.estimatedCost ? Number(tender.estimatedCost) : undefined,
          city: tender.city,
          deadline: tender.deadline?.toISOString(),
          institution: tender.institution,
        });

        return NextResponse.json({ success: true, eligibility });
      }

      case "update-profile": {
        await updateFirmEmbedding(user.id);
        return NextResponse.json({ success: true, message: "Firma profili embedding güncellendi" });
      }

      default: {
        // Default: return matches without full scan task
        const matches = await matchTendersForUser(user.id);
        return NextResponse.json({ success: true, matches });
      }
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Eşleştirme hatası";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
