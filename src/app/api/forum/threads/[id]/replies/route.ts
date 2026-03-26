import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { addReply } from "@/lib/community";
import { moderateContent } from "@/lib/services/content-moderation";
import { parseMentions, resolveMentions } from "@/lib/services/forum-search";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    if (!body.content) {
      return NextResponse.json({ error: "İçerik gerekli" }, { status: 400 });
    }

    // Content moderation
    const modResult = await moderateContent(body.content);
    if (!modResult.approved) {
      return NextResponse.json(
        { error: "İçerik moderasyon kontrolünden geçemedi", reasons: modResult.reasons },
        { status: 422 },
      );
    }

    const content = modResult.sanitizedContent || body.content;
    const reply = await addReply(id, user.id, content);

    // Process @mentions
    const mentions = parseMentions(content);
    if (mentions.length > 0) {
      const resolved = await resolveMentions(mentions);
      // Mention data returned for client-side notification handling
      return NextResponse.json(
        { success: true, data: reply, mentions: resolved },
        { status: 201 },
      );
    }

    return NextResponse.json({ success: true, data: reply }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Yanıt eklenemedi";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
