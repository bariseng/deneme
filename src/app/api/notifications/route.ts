import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { markReadSchema } from "@/lib/validations/notification";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }

    const unreadOnly = request.nextUrl.searchParams.get("unread") === "true";
    const type = request.nextUrl.searchParams.get("type");

    const where: Record<string, unknown> = { userId: user.id };
    if (unreadOnly) where.isRead = false;
    if (type) where.type = type;

    const notifications = await prisma.notification.findMany({
      where,
      include: {
        tender: {
          select: { id: true, title: true, city: true, tenderType: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: user.id, isRead: false },
    });

    return NextResponse.json({
      success: true,
      data: notifications,
      unreadCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bildirimler alınamadı";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }

    const body = await request.json();

    if (body.markAllRead) {
      await prisma.notification.updateMany({
        where: { userId: user.id, isRead: false },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true });
    }

    const parsed = markReadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    await prisma.notification.updateMany({
      where: { id: { in: parsed.data.ids }, userId: user.id },
      data: { isRead: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bildirimler güncellenemedi";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }

    const { to, tenderTitle, tenderId, type } = await request.json();

    if (!to || !tenderTitle || !tenderId || !type) {
      return NextResponse.json(
        { error: "Eksik parametreler: to, tenderTitle, tenderId, type gerekli" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, data: { messageId: `msg-${Date.now()}` } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "E-posta gönderim hatası";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
