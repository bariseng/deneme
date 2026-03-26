import { NextRequest, NextResponse } from "next/server";
import { searchForum } from "@/lib/services/forum-search";

/**
 * GET /api/forum/search?q=query&type=thread|reply|all&page=1
 * PostgreSQL full-text search across forum threads, replies, and wiki
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");
    const type = searchParams.get("type") as "thread" | "reply" | "all" | null;
    const page = parseInt(searchParams.get("page") || "1");

    if (!q || q.trim().length < 2) {
      return NextResponse.json({ error: "Arama sorgusu en az 2 karakter olmalı" }, { status: 400 });
    }

    const results = await searchForum(q, {
      page,
      type: type || "all",
    });

    return NextResponse.json({ success: true, ...results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Arama hatası";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
