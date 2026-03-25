import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkiniz bulunmuyor" }, { status: 403 });
    }

    const { userId, title, body, url } = await request.json();

    const subscriptions = await prisma.pushSubscription.findMany({
      where: userId ? { userId } : {},
    });

    // Not: Gerçek web-push kütüphanesi kullanılacak
    // Şimdilik simülasyon
    const sent = subscriptions.length;

    return NextResponse.json({
      success: true,
      data: { sent, title, body, url },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Push bildirim gönderilemedi";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
