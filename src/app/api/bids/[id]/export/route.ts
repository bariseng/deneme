import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }

    const { id } = await params;

    const bid = await prisma.bid.findFirst({
      where: { id, userId: user.id },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        tender: true,
      },
    });

    if (!bid) {
      return NextResponse.json({ error: "Teklif bulunamadı" }, { status: 404 });
    }

    // PDF generation data
    return NextResponse.json({
      success: true,
      data: {
        bid,
        exportedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "PDF oluşturulamadı";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
