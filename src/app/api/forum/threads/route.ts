import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getThreadsByCategory, getLatestThreads, createThread } from "@/lib/community";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");
    const page = parseInt(searchParams.get("page") || "1");

    if (categoryId) {
      const data = await getThreadsByCategory(categoryId, page);
      return NextResponse.json({ success: true, data });
    }
    const threads = await getLatestThreads();
    return NextResponse.json({ success: true, data: { threads, total: threads.length } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Konular alınamadı";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    if (!body.categoryId || !body.title || !body.content) {
      return NextResponse.json({ error: "Gerekli alanlar eksik" }, { status: 400 });
    }

    const thread = await createThread(user.id, body.categoryId, body.title, body.content);
    return NextResponse.json({ success: true, data: thread }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Konu oluşturulamadı";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
