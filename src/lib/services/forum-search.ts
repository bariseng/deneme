// ─── Forum Search & Interaction Service ───────────────────
// PostgreSQL full-text search, @mention parsing, content reporting

import { prisma } from "@/lib/prisma";

// ─── Types ──────────────────────────────────────────────────

export interface SearchResult {
  type: "thread" | "reply" | "wiki";
  id: string;
  title: string;
  excerpt: string;
  authorName: string;
  createdAt: Date;
  relevance: number;
}

export interface ContentReport {
  id: string;
  contentType: "thread" | "reply" | "review" | "wiki";
  contentId: string;
  reason: string;
  status: "PENDING" | "REVIEWED" | "RESOLVED";
}

export interface MentionNotification {
  userId: string;
  mentionedBy: string;
  contentType: string;
  contentId: string;
  excerpt: string;
}

// ─── Full-Text Search ───────────────────────────────────────
// Uses PostgreSQL ts_vector via raw SQL for proper Turkish search

export async function searchForum(
  query: string,
  options: { page?: number; limit?: number; type?: "thread" | "reply" | "all" } = {},
): Promise<{ results: SearchResult[]; total: number }> {
  const page = options.page || 1;
  const limit = options.limit || 20;
  const offset = (page - 1) * limit;

  // Sanitize query for ts_query
  const sanitized = query
    .replace(/[^\w\sığüşöçİĞÜŞÖÇ]/g, "")
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .join(" & ");

  if (!sanitized) return { results: [], total: 0 };

  const results: SearchResult[] = [];

  // Search threads
  if (options.type !== "reply") {
    const threads = await prisma.$queryRawUnsafe<
      { id: string; title: string; content: string; name: string; created_at: Date; rank: number }[]
    >(
      `SELECT ft.id, ft.title, ft.content, u.name, ft."createdAt" as created_at,
              ts_rank(to_tsvector('simple', ft.title || ' ' || ft.content), plainto_tsquery('simple', $1)) as rank
       FROM "ForumThread" ft
       JOIN "User" u ON ft."authorId" = u.id
       WHERE to_tsvector('simple', ft.title || ' ' || ft.content) @@ plainto_tsquery('simple', $1)
       ORDER BY rank DESC
       LIMIT $2 OFFSET $3`,
      query,
      limit,
      offset,
    );

    for (const t of threads) {
      results.push({
        type: "thread",
        id: t.id,
        title: t.title,
        excerpt: t.content.substring(0, 200),
        authorName: t.name || "Anonim",
        createdAt: t.created_at,
        relevance: t.rank,
      });
    }
  }

  // Search replies
  if (options.type !== "thread") {
    const replies = await prisma.$queryRawUnsafe<
      { id: string; thread_title: string; content: string; name: string; created_at: Date; rank: number }[]
    >(
      `SELECT fr.id, ft.title as thread_title, fr.content, u.name, fr."createdAt" as created_at,
              ts_rank(to_tsvector('simple', fr.content), plainto_tsquery('simple', $1)) as rank
       FROM "ForumReply" fr
       JOIN "ForumThread" ft ON fr."threadId" = ft.id
       JOIN "User" u ON fr."authorId" = u.id
       WHERE to_tsvector('simple', fr.content) @@ plainto_tsquery('simple', $1)
       ORDER BY rank DESC
       LIMIT $2 OFFSET $3`,
      query,
      limit,
      offset,
    );

    for (const r of replies) {
      results.push({
        type: "reply",
        id: r.id,
        title: r.thread_title,
        excerpt: r.content.substring(0, 200),
        authorName: r.name || "Anonim",
        createdAt: r.created_at,
        relevance: r.rank,
      });
    }
  }

  // Search wiki
  if (options.type === "all" || !options.type) {
    const wikis = await prisma.$queryRawUnsafe<
      { id: string; title: string; content: string; created_at: Date; rank: number }[]
    >(
      `SELECT wa.id, wa.title, wa.content, wa."createdAt" as created_at,
              ts_rank(to_tsvector('simple', wa.title || ' ' || wa.content), plainto_tsquery('simple', $1)) as rank
       FROM "WikiArticle" wa
       WHERE wa."isPublished" = true
         AND to_tsvector('simple', wa.title || ' ' || wa.content) @@ plainto_tsquery('simple', $1)
       ORDER BY rank DESC
       LIMIT $2 OFFSET $3`,
      query,
      limit,
      offset,
    );

    for (const w of wikis) {
      results.push({
        type: "wiki",
        id: w.id,
        title: w.title,
        excerpt: w.content.substring(0, 200),
        authorName: "",
        createdAt: w.created_at,
        relevance: w.rank,
      });
    }
  }

  // Sort all by relevance
  results.sort((a, b) => b.relevance - a.relevance);

  return { results: results.slice(0, limit), total: results.length };
}

// ─── Mention Parsing ────────────────────────────────────────

export function parseMentions(content: string): string[] {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;
  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1]);
  }
  return [...new Set(mentions)];
}

export function parseHashtags(content: string): string[] {
  const hashtagRegex = /#([\wığüşöçİĞÜŞÖÇ]+)/g;
  const tags: string[] = [];
  let match;
  while ((match = hashtagRegex.exec(content)) !== null) {
    tags.push(match[1].toLowerCase());
  }
  return [...new Set(tags)];
}

export async function resolveMentions(usernames: string[]): Promise<{ name: string; id: string }[]> {
  if (usernames.length === 0) return [];

  const users = await prisma.user.findMany({
    where: { name: { in: usernames } },
    select: { id: true, name: true },
  });

  return users.filter((u): u is { id: string; name: string } => u.name !== null);
}

// ─── Content Reporting ──────────────────────────────────────

const REPORT_REASONS = [
  "Küfür/Hakaret",
  "Spam/Reklam",
  "Kişisel Bilgi Paylaşımı",
  "Yanıltıcı Bilgi",
  "Konu Dışı İçerik",
  "Telif Hakkı İhlali",
  "Diğer",
] as const;

export function getReportReasons(): readonly string[] {
  return REPORT_REASONS;
}

// Reports are stored as notifications to admins
export async function reportContent(params: {
  reporterId: string;
  contentType: "thread" | "reply" | "review" | "wiki";
  contentId: string;
  reason: string;
  details?: string;
}): Promise<{ success: boolean }> {
  // Create a notification for admins
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });

  const message = `İçerik raporu: ${params.contentType} #${params.contentId.substring(0, 8)} — ${params.reason}${params.details ? `: ${params.details}` : ""}`;

  for (const admin of admins) {
    await prisma.notification.create({
      data: {
        userId: admin.id,
        type: "SISTEM",
        title: "İçerik Raporu",
        message,
        link: `/admin/reports`,
      },
    });
  }

  return { success: true };
}
