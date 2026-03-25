import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const competitor = await prisma.competitorProfile.findUnique({
      where: { id },
      include: {
        experiences: { orderBy: { year: "desc" } },
      },
    });

    if (!competitor) {
      return NextResponse.json({ error: "Rakip profili bulunamadı" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: competitor });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Rakip profili alınamadı";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
