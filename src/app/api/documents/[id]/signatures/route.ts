import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { requestSignature, signDocument, rejectSignature, getSignatureRequests } from "@/lib/document-manager";

/**
 * GET /api/documents/:id/signatures — Get user's signature requests
 */
export async function GET() {
  try {
    const user = await requireAuth();
    const requests = await getSignatureRequests(user.id);
    return NextResponse.json({ success: true, data: requests });
  } catch (error) {
    const message = error instanceof Error ? error.message : "İmza talepleri yüklenemedi";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/documents/:id/signatures — Request signature or respond
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    // Request new signature
    if (body.action === "request") {
      if (!body.versionId || !body.signerId) {
        return NextResponse.json({ error: "versionId ve signerId zorunludur" }, { status: 400 });
      }
      const result = await requestSignature({
        versionId: body.versionId,
        signerId: body.signerId,
        method: body.method,
      });
      return NextResponse.json({ success: true, data: result }, { status: 201 });
    }

    // Sign document
    if (body.action === "sign") {
      if (!body.requestId) {
        return NextResponse.json({ error: "requestId zorunludur" }, { status: 400 });
      }
      // Simulate certificate generation
      const certificateId = `CERT-${Date.now()}-${user.id.slice(0, 8)}`;
      await signDocument(body.requestId, certificateId);
      return NextResponse.json({ success: true, certificateId });
    }

    // Reject
    if (body.action === "reject") {
      if (!body.requestId || !body.reason) {
        return NextResponse.json({ error: "requestId ve reason zorunludur" }, { status: 400 });
      }
      await rejectSignature(body.requestId, body.reason);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Geçersiz action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "İmza işlemi başarısız";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
