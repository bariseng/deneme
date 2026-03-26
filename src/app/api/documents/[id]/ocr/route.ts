import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { useAICredit } from "@/lib/quota";
import { prisma } from "@/lib/prisma";
import { processDocument } from "@/lib/providers/ocr-provider";
import { generateDownloadUrl } from "@/lib/providers/storage-provider";
import { saveOCRResult } from "@/lib/document-manager";

/**
 * POST /api/documents/:id/ocr — Run OCR on a document version
 * Body: { versionId? } — if not provided, uses latest version
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    // AI credit check — OCR consumes 1 AI credit
    const credit = await useAICredit(user.id, "ocr", "OCR Doküman Tarama");
    if (!credit.success) {
      return NextResponse.json(
        { error: credit.message, upgradeRequired: true },
        { status: 403 },
      );
    }

    // Find the document version to OCR
    let version;
    if (body.versionId) {
      version = await prisma.documentVersion.findUnique({
        where: { id: body.versionId },
      });
    } else {
      // Latest version
      version = await prisma.documentVersion.findFirst({
        where: { documentId: id },
        orderBy: { version: "desc" },
      });
    }

    if (!version?.fileUrl) {
      return NextResponse.json({ error: "Doküman versiyonu bulunamadı" }, { status: 404 });
    }

    // Check if OCR already done for this version
    if (version.ocrText) {
      return NextResponse.json({
        success: true,
        cached: true,
        data: {
          text: version.ocrText,
          versionId: version.id,
          version: version.version,
        },
      });
    }

    // Download file from R2 for OCR processing
    const downloadInfo = await generateDownloadUrl(version.fileUrl, 300);
    const fileResponse = await fetch(downloadInfo.url);

    if (!fileResponse.ok) {
      return NextResponse.json({ error: "Dosya indirilemedi" }, { status: 500 });
    }

    const buffer = Buffer.from(await fileResponse.arrayBuffer());
    const mimeType = version.mimeType || "application/pdf";

    // Run OCR
    const ocrResult = await processDocument(buffer, mimeType);

    // Save OCR result to version
    await saveOCRResult(version.id, ocrResult.text);

    return NextResponse.json({
      success: true,
      data: {
        text: ocrResult.text,
        confidence: ocrResult.confidence,
        pageCount: ocrResult.pageCount,
        keywords: ocrResult.keywords,
        processingTime: ocrResult.processingTime,
        language: ocrResult.language,
        versionId: version.id,
        version: version.version,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "OCR işlemi başarısız";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
