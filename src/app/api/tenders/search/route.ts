import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get("q");

    if (!q || q.length < 2) {
      return NextResponse.json({ success: true, data: [] });
    }

    const tenders = await prisma.tender.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { institution: { contains: q, mode: "insensitive" } },
          { ekapNo: { contains: q, mode: "insensitive" } },
          { city: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 10,
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

    // Arama geçmişine kaydet
    const user = await getCurrentUser();
    if (user) {
      await prisma.searchHistory.create({
        data: {
          userId: user.id,
          query: q,
          resultCount: tenders.length,
        },
      });
    }

    return NextResponse.json({ success: true, data: tenders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Arama yapılamadı";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
