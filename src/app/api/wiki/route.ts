import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, requireAuth } from "@/lib/auth";
import { getOrSeedWikiArticles, createWikiArticle, searchWiki } from "@/lib/community";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");

    if (q) {
      const results = await searchWiki(q);
      return NextResponse.json({ success: true, data: results });
    }

    const user = await getCurrentUser();
    const articles = await getOrSeedWikiArticles(user?.id);
    return NextResponse.json({ success: true, data: articles });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Makaleler alınamadı";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    if (!body.title || !body.content) {
      return NextResponse.json({ error: "Başlık ve içerik gerekli" }, { status: 400 });
    }

    const slug = body.slug || body.title
      .toLowerCase()
      .replace(/[ğ]/g, "g").replace(/[ü]/g, "u").replace(/[ş]/g, "s")
      .replace(/[ı]/g, "i").replace(/[ö]/g, "o").replace(/[ç]/g, "c")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    const article = await createWikiArticle(user.id, {
      title: body.title,
      slug,
      content: body.content,
      summary: body.summary,
      category: body.category,
      tags: body.tags,
    });
    return NextResponse.json({ success: true, data: article }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Makale oluşturulamadı";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
