import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const sector = searchParams.get("sector");
    const unit = searchParams.get("unit");
    const period = searchParams.get("period");

    const where: Record<string, unknown> = {};
    if (sector) where.sector = sector;
    if (unit) where.unit = unit;
    if (period) where.period = period;

    const benchmarks = await prisma.benchmarkData.findMany({
      where,
      orderBy: [{ sector: "asc" }, { unit: "asc" }, { itemName: "asc" }],
      take: 100,
    });

    return NextResponse.json({ success: true, data: benchmarks });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Benchmark verileri alınamadı";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
