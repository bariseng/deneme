import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const cityStats = await prisma.tender.groupBy({
      by: ["city"],
      _count: { id: true },
      _sum: { estimatedCost: true },
      orderBy: { _count: { id: "desc" } },
      take: 20,
    });

    const data = cityStats.map((c) => ({
      city: c.city,
      count: c._count.id,
      totalBudget: c._sum.estimatedCost?.toString() || "0",
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Şehir istatistikleri alınamadı";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
