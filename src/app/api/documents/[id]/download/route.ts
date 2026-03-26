import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateDownloadUrl } from "@/lib/providers/storage-provider";

/**
 * GET /api/documents/:id/download
 * Returns a pre-signed download URL (time-limited)
 * Query: ?version=N (optional, downloads specific version)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth();
    const { id } = await params;
    const versionParam = request.nextUrl.searchParams.get("version");

    // If specific version requested
    if (versionParam) {
      const version = await prisma.documentVersion.findUnique({
        where: {
          documentId_version: {
            documentId: id,
            version: parseInt(versionParam, 10),
          },
        },
      });

      if (!version?.fileUrl) {
        return NextResponse.json({ error: "Versiyon bulunamadı" }, { status: 404 });
      }

      const download = await generateDownloadUrl(version.fileUrl);
      return NextResponse.json({
        success: true,
        downloadUrl: download.url,
        expiresAt: download.expiresAt.toISOString(),
        fileName: version.fileName,
        fileSize: version.fileSize,
        mimeType: version.mimeType,
        version: version.version,
      });
    }

    // Get latest version of document
    const document = await prisma.tenderDocument.findUnique({
      where: { id },
      select: { id: true, name: true, fileUrl: true, fileSize: true, mimeType: true },
    });

    if (!document?.fileUrl) {
      return NextResponse.json({ error: "Doküman bulunamadı" }, { status: 404 });
    }

    const download = await generateDownloadUrl(document.fileUrl);

    return NextResponse.json({
      success: true,
      downloadUrl: download.url,
      expiresAt: download.expiresAt.toISOString(),
      fileName: document.name,
      fileSize: document.fileSize,
      mimeType: document.mimeType,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Download hatası";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
