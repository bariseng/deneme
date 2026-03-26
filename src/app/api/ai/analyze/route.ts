import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { analyzeTender, analyzeTenderStream } from "@/lib/services/ai-analysis";

/**
 * POST /api/ai/analyze
 * İhale dokümanı analizi (streaming veya non-streaming)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }

    const { tenderId, stream } = await request.json();

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

    const input = {
      tenderId: tender.id,
      title: tender.title,
      description: tender.description || undefined,
      requirements: tender.requirements || undefined,
      tenderType: tender.tenderType || undefined,
      estimatedCost: tender.estimatedCost ? Number(tender.estimatedCost) : undefined,
      city: tender.city,
      deadline: tender.deadline?.toISOString(),
      institution: tender.institution,
    };

    // Streaming response
    if (stream) {
      const readableStream = analyzeTenderStream(input);
      return new Response(readableStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Non-streaming response
    const analysis = await analyzeTender(user.id, input);
    return NextResponse.json({ success: true, analysis });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Analiz hatası";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
