import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getVersionHistory, createVersion, revertToVersion } from "@/lib/document-manager";

/**
 * GET /api/documents/:id/versions — Get version history
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const versions = await getVersionHistory(id);
    return NextResponse.json({ success: true, data: versions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Versiyonlar yüklenemedi";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/documents/:id/versions — Create new version or revert
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    // Revert to version
    if (body.revertTo) {
      const result = await revertToVersion(id, body.revertTo, user.id);
      return NextResponse.json({ success: true, data: result });
    }

    // Create new version
    if (!body.fileUrl || !body.fileName) {
      return NextResponse.json({ error: "fileUrl ve fileName zorunludur" }, { status: 400 });
    }

    const result = await createVersion({
      documentId: id,
      fileUrl: body.fileUrl,
      fileName: body.fileName,
      fileSize: body.fileSize,
      mimeType: body.mimeType,
      changeSummary: body.changeSummary,
      createdById: user.id,
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Versiyon oluşturulamadı";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
