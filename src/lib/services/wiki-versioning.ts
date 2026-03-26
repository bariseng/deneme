// ─── Wiki Versioning Service ──────────────────────────────
// Makale versiyon geçmişi, diff, rollback

import { prisma } from "@/lib/prisma";

// ─── Types ──────────────────────────────────────────────────

export interface WikiRevision {
  version: number;
  title: string;
  content: string;
  summary: string | null;
  editorName: string | null;
  editedAt: Date;
}

export interface WikiDiff {
  fromVersion: number;
  toVersion: number;
  titleChanged: boolean;
  addedLines: string[];
  removedLines: string[];
  similarity: number;
}

// ─── Version History ────────────────────────────────────────

// We store version history by keeping snapshots in a JSON field
// or by using the version increment already in WikiArticle.
// Since schema has version field, we track history via cache/log table.

// For version history, we store snapshots before each edit
// using CachedData model as a lightweight revision store.

export async function saveWikiSnapshot(
  articleId: string,
  version: number,
  data: { title: string; content: string; summary: string | null; editorId: string },
): Promise<void> {
  const key = `wiki_revision:${articleId}:v${version}`;

  const payload = JSON.parse(JSON.stringify({
    articleId,
    version,
    title: data.title,
    content: data.content,
    summary: data.summary,
    editorId: data.editorId,
    editedAt: new Date().toISOString(),
  }));

  await prisma.cachedData.upsert({
    where: { key },
    create: {
      key,
      provider: "WIKI",
      value: payload,
      ttl: 365 * 24 * 60 * 60,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
    update: {
      value: payload,
    },
  });
}

export async function getWikiRevisions(articleSlug: string): Promise<WikiRevision[]> {
  const article = await prisma.wikiArticle.findUnique({
    where: { slug: articleSlug },
    select: { id: true, version: true, title: true, content: true, summary: true, lastEditedBy: true, updatedAt: true },
  });

  if (!article) throw new Error("Makale bulunamadı");

  // Fetch all stored revisions
  const snapshots = await prisma.cachedData.findMany({
    where: { key: { startsWith: `wiki_revision:${article.id}:v` } },
    orderBy: { createdAt: "desc" },
  });

  const revisions: WikiRevision[] = [];

  // Current version
  const editor = await prisma.user.findUnique({
    where: { id: article.lastEditedBy },
    select: { name: true },
  });

  revisions.push({
    version: article.version,
    title: article.title,
    content: article.content,
    summary: article.summary,
    editorName: editor?.name || null,
    editedAt: article.updatedAt,
  });

  // Historical versions from snapshots
  for (const snap of snapshots) {
    const data = snap.value as {
      version: number;
      title: string;
      content: string;
      summary: string | null;
      editorId: string;
      editedAt: string;
    };

    if (data.version === article.version) continue; // Skip current

    const snapEditor = await prisma.user.findUnique({
      where: { id: data.editorId },
      select: { name: true },
    });

    revisions.push({
      version: data.version,
      title: data.title,
      content: data.content,
      summary: data.summary,
      editorName: snapEditor?.name || null,
      editedAt: new Date(data.editedAt),
    });
  }

  return revisions.sort((a, b) => b.version - a.version);
}

// ─── Version Diff ───────────────────────────────────────────

export async function compareWikiVersions(
  articleSlug: string,
  fromVersion: number,
  toVersion: number,
): Promise<WikiDiff> {
  const revisions = await getWikiRevisions(articleSlug);

  const from = revisions.find((r) => r.version === fromVersion);
  const to = revisions.find((r) => r.version === toVersion);

  if (!from || !to) throw new Error("Belirtilen versiyon bulunamadı");

  const fromLines = from.content.split("\n");
  const toLines = to.content.split("\n");
  const fromSet = new Set(fromLines);
  const toSet = new Set(toLines);

  const addedLines = toLines.filter((l) => !fromSet.has(l) && l.trim().length > 0);
  const removedLines = fromLines.filter((l) => !toSet.has(l) && l.trim().length > 0);

  const allLines = new Set([...fromLines, ...toLines]);
  const commonLines = fromLines.filter((l) => toSet.has(l));
  const similarity = allLines.size > 0 ? Math.round((commonLines.length / allLines.size) * 100) : 100;

  return {
    fromVersion,
    toVersion,
    titleChanged: from.title !== to.title,
    addedLines: addedLines.slice(0, 100),
    removedLines: removedLines.slice(0, 100),
    similarity,
  };
}

// ─── Rollback ───────────────────────────────────────────────

export async function rollbackWikiArticle(
  articleSlug: string,
  targetVersion: number,
  editorId: string,
): Promise<WikiRevision> {
  const revisions = await getWikiRevisions(articleSlug);
  const target = revisions.find((r) => r.version === targetVersion);

  if (!target) throw new Error(`Versiyon ${targetVersion} bulunamadı`);

  const article = await prisma.wikiArticle.findUnique({
    where: { slug: articleSlug },
  });

  if (!article) throw new Error("Makale bulunamadı");

  // Save current version as snapshot before rollback
  await saveWikiSnapshot(article.id, article.version, {
    title: article.title,
    content: article.content,
    summary: article.summary,
    editorId: article.lastEditedBy,
  });

  // Update article to target version content with new version number
  const newVersion = article.version + 1;

  await prisma.wikiArticle.update({
    where: { slug: articleSlug },
    data: {
      title: target.title,
      content: target.content,
      summary: `v${targetVersion} sürümüne geri alındı`,
      version: newVersion,
      lastEditedBy: editorId,
    },
  });

  return {
    version: newVersion,
    title: target.title,
    content: target.content,
    summary: `v${targetVersion} sürümüne geri alındı`,
    editorName: null,
    editedAt: new Date(),
  };
}
