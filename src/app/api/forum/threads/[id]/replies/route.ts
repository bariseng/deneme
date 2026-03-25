import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { addReply } from "@/lib/community";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    if (!body.content) {
      return NextResponse.json({ error: "İçerik gerekli" }, { status: 400 });
    }

    const reply = await addReply(id, user.id, body.content);
    return NextResponse.json({ success: true, data: reply }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Yanıt eklenemedi";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
