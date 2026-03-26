import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createVersion } from "@/lib/document-manager";
import {
  getVersionHistory,
  rollbackToVersion,
  compareVersions,
} from "@/lib/services/document-versioning";

/**
 * GET /api/documents/:id/versions
 * Query: ?download=true (include pre-signed URLs), ?diff=1,2 (compare versions)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth();
    const { id } = await params;
    const sp = request.nextUrl.searchParams;

    // Version diff comparison
    const diff = sp.get("diff");
    if (diff) {
      const [from, to] = diff.split(",").map(Number);
      if (!from || !to) {
        return NextResponse.json({ error: "diff=FROM,TO formatında belirtin" }, { status: 400 });
      }
      const result = await compareVersions(id, from, to);
      return NextResponse.json({ success: true, diff: result });
    }

    // Version history
    const includeUrls = sp.get("download") === "true";
    const versions = await getVersionHistory(id, includeUrls);

    return NextResponse.json({ success: true, versions });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Versiyon hatası";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * POST /api/documents/:id/versions
 * Body: { action: "rollback", version: N } or { fileUrl, fileName, ... }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    // Rollback action
    if (body.action === "rollback" || body.revertTo) {
      const version = body.version || body.revertTo;
      if (!version || typeof version !== "number") {
        return NextResponse.json({ error: "Versiyon numarası gerekli" }, { status: 400 });
      }
      const result = await rollbackToVersion(id, version, user.id);
      return NextResponse.json({ success: true, version: result });
    }

    // Create new version (legacy support)
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
    const msg = error instanceof Error ? error.message : "Versiyon hatası";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
