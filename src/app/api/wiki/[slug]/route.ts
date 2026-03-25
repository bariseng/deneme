import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getWikiBySlug, updateWikiArticle } from "@/lib/community";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const article = await getWikiBySlug(slug);
    if (!article) {
      return NextResponse.json({ error: "Makale bulunamadı" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: article });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Makale alınamadı";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const user = await requireAuth();
    const { slug } = await params;
    const body = await request.json();

    const article = await updateWikiArticle(slug, user.id, {
      title: body.title,
      content: body.content,
      summary: body.summary,
      category: body.category,
      tags: body.tags,
    });
    return NextResponse.json({ success: true, data: article });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Makale güncellenemedi";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
