import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getWikiBySlug, updateWikiArticle } from "@/lib/community";
import { saveWikiSnapshot, getWikiRevisions, compareWikiVersions, rollbackWikiArticle } from "@/lib/services/wiki-versioning";
import { moderateContent } from "@/lib/services/content-moderation";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const action = request.nextUrl.searchParams.get("action");

    // Version history
    if (action === "revisions") {
      const revisions = await getWikiRevisions(slug);
      return NextResponse.json({ success: true, revisions });
    }

    // Version diff
    if (action === "diff") {
      const from = parseInt(request.nextUrl.searchParams.get("from") || "0");
      const to = parseInt(request.nextUrl.searchParams.get("to") || "0");
      if (!from || !to) {
        return NextResponse.json({ error: "from ve to parametreleri gerekli" }, { status: 400 });
      }
      const diff = await compareWikiVersions(slug, from, to);
      return NextResponse.json({ success: true, diff });
    }

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
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const user = await requireAuth();
    const { slug } = await params;
    const body = await request.json();

    // Rollback action
    if (body.action === "rollback" && body.version) {
      const result = await rollbackWikiArticle(slug, body.version, user.id);
      return NextResponse.json({ success: true, data: result });
    }

    // Content moderation for edits
    if (body.content) {
      const modResult = await moderateContent(body.content);
      if (!modResult.approved) {
        return NextResponse.json(
          { error: "İçerik moderasyon kontrolünden geçemedi", reasons: modResult.reasons },
          { status: 422 },
        );
      }
    }

    // Save current version as snapshot before update
    const current = await prisma.wikiArticle.findUnique({ where: { slug } });
    if (current) {
      await saveWikiSnapshot(current.id, current.version, {
        title: current.title,
        content: current.content,
        summary: current.summary,
        editorId: current.lastEditedBy,
      });
    }

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
