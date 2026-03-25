import { NextRequest, NextResponse } from "next/server";
import { validateShareLink } from "@/lib/document-manager";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/documents/share/:token — Validate share link and get document
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const result = await validateShareLink(token);

    if (!result.valid) {
      return NextResponse.json({ error: result.message }, { status: 403 });
    }

    const document = await prisma.tenderDocument.findUnique({
      where: { id: result.documentId },
      select: {
        id: true,
        name: true,
        fileUrl: true,
        fileSize: true,
        mimeType: true,
      },
    });

    if (!document) {
      return NextResponse.json({ error: "Doküman bulunamadı" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: document });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Doküman yüklenemedi";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
