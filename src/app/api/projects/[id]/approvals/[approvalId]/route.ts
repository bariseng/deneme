import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { approveStep, rejectStep } from "@/lib/document-manager";

/**
 * PATCH /api/projects/:id/approvals/:approvalId — Approve or reject
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; approvalId: string }> }
) {
  try {
    await requireAuth();
    const { approvalId } = await params;
    const body = await request.json();

    if (body.action === "approve") {
      const result = await approveStep(approvalId, body.comment);
      return NextResponse.json({ success: true, data: result });
    }

    if (body.action === "reject") {
      if (!body.comment) {
        return NextResponse.json({ error: "Red gerekçesi zorunludur" }, { status: 400 });
      }
      await rejectStep(approvalId, body.comment);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Geçersiz action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Onay işlemi başarısız";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
