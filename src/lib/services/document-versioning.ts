// ─── Document Versioning Service ──────────────────────────
// R2-backed versioning: v1, v2, v3...
// Diff comparison, rollback, storage tracking

import { prisma } from "@/lib/prisma";
import { copyFile, generateDownloadUrl, deleteFile } from "@/lib/providers/storage-provider";

// ─── Types ──────────────────────────────────────────────────

export interface VersionInfo {
  id: string;
  version: number;
  fileName: string;
  fileSize: number | null;
  mimeType: string | null;
  changeSummary: string | null;
  ocrText: string | null;
  createdBy: { id: string; name: string | null; image: string | null };
  createdAt: Date;
  downloadUrl?: string;
}

export interface VersionDiff {
  fromVersion: number;
  toVersion: number;
  changes: {
    field: string;
    description: string;
  }[];
  ocrDiff?: {
    addedLines: string[];
    removedLines: string[];
    similarity: number;
  };
}

// ─── Create Version ─────────────────────────────────────────

export async function createDocumentVersion(params: {
  documentId: string;
  fileKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  changeSummary?: string;
  createdById: string;
  ocrText?: string;
}): Promise<VersionInfo> {
  // Get next version number
  const lastVersion = await prisma.documentVersion.findFirst({
    where: { documentId: params.documentId },
    orderBy: { version: "desc" },
    select: { version: true },
  });

  const nextVersion = (lastVersion?.version ?? 0) + 1;

  const version = await prisma.documentVersion.create({
    data: {
      documentId: params.documentId,
      version: nextVersion,
      fileUrl: params.fileKey, // R2 key
      fileName: params.fileName,
      fileSize: params.fileSize,
      mimeType: params.mimeType,
      changeSummary: params.changeSummary,
      ocrText: params.ocrText,
      createdById: params.createdById,
    },
    include: {
      createdBy: { select: { id: true, name: true, image: true } },
    },
  });

  // Update document's main file reference
  await prisma.tenderDocument.update({
    where: { id: params.documentId },
    data: {
      fileUrl: params.fileKey,
      fileSize: String(params.fileSize),
      mimeType: params.mimeType,
    },
  });

  return {
    id: version.id,
    version: version.version,
    fileName: version.fileName,
    fileSize: version.fileSize,
    mimeType: version.mimeType,
    changeSummary: version.changeSummary,
    ocrText: version.ocrText,
    createdBy: version.createdBy,
    createdAt: version.createdAt,
  };
}

// ─── Get Version History ────────────────────────────────────

export async function getVersionHistory(
  documentId: string,
  includeDownloadUrls: boolean = false,
): Promise<VersionInfo[]> {
  const versions = await prisma.documentVersion.findMany({
    where: { documentId },
    include: {
      createdBy: { select: { id: true, name: true, image: true } },
    },
    orderBy: { version: "desc" },
  });

  const results: VersionInfo[] = [];

  for (const v of versions) {
    let downloadUrl: string | undefined;
    if (includeDownloadUrls && v.fileUrl) {
      try {
        const dl = await generateDownloadUrl(v.fileUrl);
        downloadUrl = dl.url;
      } catch {
        // File may not exist in R2 yet
      }
    }

    results.push({
      id: v.id,
      version: v.version,
      fileName: v.fileName,
      fileSize: v.fileSize,
      mimeType: v.mimeType,
      changeSummary: v.changeSummary,
      ocrText: v.ocrText,
      createdBy: v.createdBy,
      createdAt: v.createdAt,
      downloadUrl,
    });
  }

  return results;
}

// ─── Rollback ───────────────────────────────────────────────

export async function rollbackToVersion(
  documentId: string,
  targetVersion: number,
  userId: string,
): Promise<VersionInfo> {
  const target = await prisma.documentVersion.findUnique({
    where: { documentId_version: { documentId, version: targetVersion } },
  });

  if (!target) {
    throw new Error(`Versiyon ${targetVersion} bulunamadı`);
  }

  // Copy the old file to a new key for the new version
  const timestamp = Date.now();
  const newKey = `${target.fileUrl.split("/").slice(0, -1).join("/")}/${timestamp}_rollback_v${targetVersion}_${target.fileName}`;

  try {
    await copyFile(target.fileUrl, newKey);
  } catch {
    // If copy fails, reuse the same key (file still exists)
  }

  // Create new version as rollback
  return createDocumentVersion({
    documentId,
    fileKey: target.fileUrl, // Use original key if copy failed
    fileName: target.fileName,
    fileSize: target.fileSize || 0,
    mimeType: target.mimeType || "application/octet-stream",
    changeSummary: `v${targetVersion} sürümüne geri alındı`,
    createdById: userId,
    ocrText: target.ocrText || undefined,
  });
}

// ─── Version Diff ───────────────────────────────────────────

export async function compareVersions(
  documentId: string,
  fromVersion: number,
  toVersion: number,
): Promise<VersionDiff> {
  const [from, to] = await Promise.all([
    prisma.documentVersion.findUnique({
      where: { documentId_version: { documentId, version: fromVersion } },
    }),
    prisma.documentVersion.findUnique({
      where: { documentId_version: { documentId, version: toVersion } },
    }),
  ]);

  if (!from || !to) {
    throw new Error("Belirtilen versiyonlar bulunamadı");
  }

  const changes: { field: string; description: string }[] = [];

  if (from.fileName !== to.fileName) {
    changes.push({ field: "Dosya adı", description: `"${from.fileName}" → "${to.fileName}"` });
  }
  if (from.fileSize !== to.fileSize) {
    changes.push({
      field: "Dosya boyutu",
      description: `${formatBytes(from.fileSize || 0)} → ${formatBytes(to.fileSize || 0)}`,
    });
  }
  if (from.mimeType !== to.mimeType) {
    changes.push({ field: "Dosya türü", description: `${from.mimeType} → ${to.mimeType}` });
  }

  // OCR text diff
  let ocrDiff: VersionDiff["ocrDiff"];
  if (from.ocrText && to.ocrText) {
    const fromLines = from.ocrText.split("\n");
    const toLines = to.ocrText.split("\n");
    const fromSet = new Set(fromLines);
    const toSet = new Set(toLines);

    const addedLines = toLines.filter((l) => !fromSet.has(l) && l.trim().length > 0);
    const removedLines = fromLines.filter((l) => !toSet.has(l) && l.trim().length > 0);

    // Simple similarity calculation
    const allLines = new Set([...fromLines, ...toLines]);
    const commonLines = fromLines.filter((l) => toSet.has(l));
    const similarity = allLines.size > 0 ? Math.round((commonLines.length / allLines.size) * 100) : 100;

    ocrDiff = { addedLines: addedLines.slice(0, 50), removedLines: removedLines.slice(0, 50), similarity };
    changes.push({ field: "İçerik", description: `%${similarity} benzerlik, ${addedLines.length} ekleme, ${removedLines.length} silme` });
  }

  return { fromVersion, toVersion, changes, ocrDiff };
}

// ─── Delete Version ─────────────────────────────────────────

export async function deleteVersion(
  documentId: string,
  version: number,
): Promise<void> {
  const ver = await prisma.documentVersion.findUnique({
    where: { documentId_version: { documentId, version } },
  });

  if (!ver) throw new Error("Versiyon bulunamadı");

  // Don't allow deleting the only version
  const count = await prisma.documentVersion.count({ where: { documentId } });
  if (count <= 1) {
    throw new Error("Son versiyon silinemez");
  }

  // Delete from R2
  try {
    await deleteFile(ver.fileUrl);
  } catch {
    // File may already be deleted
  }

  await prisma.documentVersion.delete({
    where: { documentId_version: { documentId, version } },
  });
}

// ─── Storage Usage ──────────────────────────────────────────

export async function getUserStorageUsage(userId: string): Promise<{
  totalBytes: number;
  documentCount: number;
  versionCount: number;
}> {
  const versions = await prisma.documentVersion.findMany({
    where: { createdById: userId },
    select: { fileSize: true },
  });

  const totalBytes = versions.reduce((sum, v) => sum + (v.fileSize || 0), 0);

  const documentCount = await prisma.tenderDocument.count({
    where: { tender: { favorites: { some: { userId } } } },
  });

  return { totalBytes, documentCount, versionCount: versions.length };
}

// ─── Helpers ────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
