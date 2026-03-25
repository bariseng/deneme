import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createShareLink } from "@/lib/document-manager";

/**
 * POST /api/documents/:id/share — Create a share link
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    const result = await createShareLink({
      documentId: id,
      createdById: user.id,
      expiresInHours: body.expiresInHours || 24,
      maxDownloads: body.maxDownloads || 1,
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Paylaşım linki oluşturulamadı";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
