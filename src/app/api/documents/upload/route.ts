import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  generateUploadUrl,
  confirmUpload,
  scanForVirus,
  generateDownloadUrl,
  deleteFile,
  getFileSizeLimit,
} from "@/lib/providers/storage-provider";
import { createDocumentVersion } from "@/lib/services/document-versioning";

/**
 * POST /api/documents/upload
 * Step 1: Get pre-signed upload URL
 * Body: { fileName, mimeType, fileSize, tenderId?, documentId? }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { fileName, mimeType, fileSize, tenderId, documentId, changeSummary } = body;

    if (!fileName || !mimeType || !fileSize) {
      return NextResponse.json(
        { error: "fileName, mimeType ve fileSize zorunludur" },
        { status: 400 },
      );
    }

    // Plan-based file size check
    const maxSize = getFileSizeLimit(user.plan);
    if (fileSize > maxSize) {
      const maxMB = Math.round(maxSize / (1024 * 1024));
      return NextResponse.json(
        {
          error: `Dosya boyutu limiti aşıldı (${maxMB} MB). Planınızı yükseltin.`,
          upgradeRequired: true,
          maxSize,
        },
        { status: 413 },
      );
    }

    // Generate pre-signed upload URL
    const { uploadUrl, key } = await generateUploadUrl({
      userId: user.id,
      fileName,
      mimeType,
      fileSize,
      plan: user.plan,
      tenderId,
    });

    return NextResponse.json({
      success: true,
      uploadUrl,
      key,
      confirmEndpoint: "/api/documents/upload/confirm",
      instructions: "PUT isteği ile uploadUrl'ye dosyayı yükleyin, sonra confirm endpoint'i çağırın.",
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Upload hatası";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * PUT /api/documents/upload
 * Step 2: Confirm upload, run virus scan, create DB records
 * Body: { key, fileName, tenderId?, documentId?, changeSummary? }
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { key, fileName, tenderId, documentId, changeSummary } = await request.json();

    if (!key || !fileName) {
      return NextResponse.json({ error: "key ve fileName zorunludur" }, { status: 400 });
    }

    // Verify file exists in R2
    const fileInfo = await confirmUpload(key);

    // Virus scan
    const tempUrl = await generateDownloadUrl(key, 300);
    const scanResult = await scanForVirus(tempUrl.url);

    if (!scanResult.safe) {
      // Delete infected file
      await deleteFile(key);
      return NextResponse.json(
        { error: "Dosya virüs taramasından geçemedi", threat: scanResult.threat },
        { status: 422 },
      );
    }

    // Create or update document record
    let docId = documentId;

    if (!docId && tenderId) {
      // Create new document
      const doc = await prisma.tenderDocument.create({
        data: {
          tenderId,
          name: fileName,
          fileUrl: key,
          fileSize: String(fileInfo.size),
          mimeType: fileInfo.mimeType,
        },
      });
      docId = doc.id;
    }

    // Create version
    let version = null;
    if (docId) {
      version = await createDocumentVersion({
        documentId: docId,
        fileKey: key,
        fileName,
        fileSize: fileInfo.size,
        mimeType: fileInfo.mimeType,
        changeSummary: changeSummary || "İlk yükleme",
        createdById: user.id,
      });
    }

    return NextResponse.json({
      success: true,
      documentId: docId,
      version,
      fileSize: fileInfo.size,
      mimeType: fileInfo.mimeType,
      virusScan: { passed: true, scanId: scanResult.scanId },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Confirm hatası";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
