import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getProjectApprovals, initApprovalWorkflow } from "@/lib/document-manager";

/**
 * GET /api/projects/:id/approvals — Get approval workflow
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const approvals = await getProjectApprovals(id);
    return NextResponse.json({ success: true, data: approvals });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Onay akışı yüklenemedi";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/projects/:id/approvals — Initialize approval workflow
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const { approverIds } = await request.json();

    if (!approverIds || approverIds.length < 1) {
      return NextResponse.json({ error: "En az bir onaylayıcı gereklidir" }, { status: 400 });
    }

    await initApprovalWorkflow(id, approverIds);
    const approvals = await getProjectApprovals(id);

    return NextResponse.json({ success: true, data: approvals }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Onay akışı oluşturulamadı";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
