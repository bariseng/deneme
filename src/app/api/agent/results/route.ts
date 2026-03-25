import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = request.nextUrl;
    const unreadOnly = searchParams.get("unread") === "true";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: Record<string, unknown> = { userId: user.id };
    if (unreadOnly) where.isRead = false;

    const [results, total, unreadCount] = await Promise.all([
      prisma.agentResult.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          tender: {
            select: {
              id: true,
              title: true,
              city: true,
              tenderType: true,
              deadline: true,
              estimatedCost: true,
              institution: true,
            },
          },
          task: {
            select: { type: true, status: true },
          },
        },
      }),
      prisma.agentResult.count({ where }),
      prisma.agentResult.count({ where: { userId: user.id, isRead: false } }),
    ]);

    return NextResponse.json({
      success: true,
      data: results,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sonuçlar alınamadı";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { resultIds } = await request.json();

    if (!resultIds?.length) {
      return NextResponse.json({ error: "Sonuç ID'leri zorunludur" }, { status: 400 });
    }

    await prisma.agentResult.updateMany({
      where: {
        id: { in: resultIds },
        userId: user.id,
      },
      data: { isRead: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Güncelleme yapılamadı";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
