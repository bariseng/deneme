import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { upvoteReply, markAsAnswer } from "@/lib/community";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; replyId: string }> }
) {
  try {
    const user = await requireAuth();
    const { id, replyId } = await params;
    const body = await request.json();

    if (body.action === "upvote") {
      await upvoteReply(replyId);
      return NextResponse.json({ success: true });
    }

    if (body.action === "mark_answer") {
      await markAsAnswer(replyId, id, user.id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Geçersiz işlem" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "İşlem başarısız";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
