import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }

    const favorites = await prisma.favorite.findMany({
      where: { userId: user.id },
      include: {
        tender: {
          select: {
            id: true,
            title: true,
            institution: true,
            city: true,
            tenderType: true,
            status: true,
            estimatedCost: true,
            deadline: true,
            publishDate: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: favorites });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Favoriler alınamadı";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }

    const { tenderId } = await request.json();
    if (!tenderId) {
      return NextResponse.json({ error: "İhale ID zorunludur" }, { status: 400 });
    }

    const existing = await prisma.favorite.findUnique({
      where: { userId_tenderId: { userId: user.id, tenderId } },
    });

    if (existing) {
      return NextResponse.json({ error: "Bu ihale zaten favorilerinizde" }, { status: 409 });
    }

    const favorite = await prisma.favorite.create({
      data: { userId: user.id, tenderId },
    });

    return NextResponse.json({ success: true, data: favorite }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Favori eklenemedi";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }

    const { tenderId } = await request.json();
    if (!tenderId) {
      return NextResponse.json({ error: "İhale ID zorunludur" }, { status: 400 });
    }

    await prisma.favorite.delete({
      where: { userId_tenderId: { userId: user.id, tenderId } },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Favori silinemedi";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
