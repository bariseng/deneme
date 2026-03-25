import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createBidSchema, updateBidSchema } from "@/lib/validations/bid";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }

    const bids = await prisma.bid.findMany({
      where: { userId: user.id },
      include: {
        tender: {
          select: {
            id: true,
            title: true,
            institution: true,
            city: true,
            tenderType: true,
            deadline: true,
            estimatedCost: true,
          },
        },
        items: { orderBy: { sortOrder: "asc" } },
        _count: { select: { items: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ success: true, data: bids });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Teklifler alınamadı";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createBidSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { items, ...bidData } = parsed.data;

    const bid = await prisma.bid.create({
      data: {
        userId: user.id,
        ...bidData,
        items: items
          ? {
              create: items.map((item, idx) => ({
                ...item,
                totalPrice: item.quantity * item.unitPrice,
                sortOrder: idx,
              })),
            }
          : undefined,
      },
      include: { items: true },
    });

    return NextResponse.json({ success: true, data: bid }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Teklif oluşturulamadı";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }

    const body = await request.json();
    const { id, items, ...rest } = body;

    if (!id) {
      return NextResponse.json({ error: "Teklif ID zorunludur" }, { status: 400 });
    }

    const parsed = updateBidSchema.safeParse(rest);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const existing = await prisma.bid.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Teklif bulunamadı" }, { status: 404 });
    }

    // Kalemleri güncelle
    if (items && Array.isArray(items)) {
      await prisma.bidItem.deleteMany({ where: { bidId: id } });
      await prisma.bidItem.createMany({
        data: items.map((item: { description: string; unit: string; quantity: number; unitPrice: number }, idx: number) => ({
          bidId: id,
          description: item.description,
          unit: item.unit,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.quantity * item.unitPrice,
          sortOrder: idx,
        })),
      });
    }

    // Toplam hesapla
    const allItems = await prisma.bidItem.findMany({ where: { bidId: id } });
    const totalAmount = allItems.reduce((sum, item) => sum + Number(item.totalPrice), 0);

    const { tenderId: _tid, items: _items, ...updateData } = parsed.data;

    const bid = await prisma.bid.update({
      where: { id },
      data: { ...updateData, totalAmount },
      include: { items: { orderBy: { sortOrder: "asc" } }, tender: true },
    });

    return NextResponse.json({ success: true, data: bid });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Teklif güncellenemedi";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
