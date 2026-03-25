import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const tender = await prisma.tender.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
      include: {
        documents: true,
        timeline: { orderBy: { date: "asc" } },
        results: true,
        _count: { select: { favorites: true, applications: true } },
      },
    });

    if (!tender) {
      return NextResponse.json({ error: "İhale bulunamadı" }, { status: 404 });
    }

    // Benzer ihaleler
    const budgetRange = Number(tender.estimatedCost) || 0;
    const similarTenders = await prisma.tender.findMany({
      where: {
        id: { not: tender.id },
        OR: [
          { tenderType: tender.tenderType, city: tender.city },
          {
            tenderType: tender.tenderType,
            estimatedCost: budgetRange > 0
              ? { gte: budgetRange * 0.7, lte: budgetRange * 1.3 }
              : undefined,
          },
        ],
      },
      take: 5,
      orderBy: { publishDate: "desc" },
      select: {
        id: true,
        title: true,
        institution: true,
        city: true,
        tenderType: true,
        status: true,
        estimatedCost: true,
        deadline: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: { ...tender, similarTenders },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "İhale detayı alınamadı";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
