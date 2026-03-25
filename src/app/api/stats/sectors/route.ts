import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const month = request.nextUrl.searchParams.get("month") || new Date().toISOString().slice(0, 7);

    const stats = await prisma.sectorStats.findMany({
      where: { month },
      orderBy: { tenderCount: "desc" },
    });

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sektör istatistikleri alınamadı";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
