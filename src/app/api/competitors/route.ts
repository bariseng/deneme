import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get("q");
    const taxNumber = request.nextUrl.searchParams.get("taxNumber");

    if (!q && !taxNumber) {
      const competitors = await prisma.competitorProfile.findMany({
        take: 20,
        orderBy: { totalWins: "desc" },
        include: { _count: { select: { experiences: true } } },
      });
      return NextResponse.json({ success: true, data: competitors });
    }

    const where: Record<string, unknown> = {};
    if (taxNumber) {
      where.taxNumber = taxNumber;
    } else if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { city: { contains: q, mode: "insensitive" } },
      ];
    }

    const competitors = await prisma.competitorProfile.findMany({
      where,
      include: { _count: { select: { experiences: true } } },
      orderBy: { totalWins: "desc" },
      take: 20,
    });

    return NextResponse.json({ success: true, data: competitors });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Rakip araması yapılamadı";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
