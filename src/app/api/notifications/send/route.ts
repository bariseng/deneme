import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  sendNotification,
  type NotificationCategory,
  type NotificationChannel,
} from "@/lib/services/notification-orchestrator";

/**
 * POST /api/notifications/send — Send notification via orchestrator
 * Body: { userId?, category, title, message, data?, channels?, priority? }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const body = await request.json();
    const {
      userId,
      category,
      title,
      message,
      data,
      channels,
      priority,
    } = body;

    if (!category || !title || !message) {
      return NextResponse.json(
        { error: "category, title, message gerekli" },
        { status: 400 },
      );
    }

    // Regular users can only send to themselves
    const targetUserId = user.role === "ADMIN" && userId ? userId : user.id;

    const result = await sendNotification({
      userId: targetUserId,
      category: category as NotificationCategory,
      title,
      message,
      data,
      channels: channels as NotificationChannel[] | undefined,
      priority,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Bildirim gönderilemedi";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
