import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { updateGuaranteeStatus } from "@/lib/contract-manager";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; guaranteeId: string }> }
) {
  try {
    const user = await requireAuth();
    const { id, guaranteeId } = await params;
    const body = await request.json();

    if (!body.status) {
      return NextResponse.json({ error: "Durum gerekli" }, { status: 400 });
    }

    const guarantee = await updateGuaranteeStatus(
      guaranteeId,
      id,
      user.id,
      body.status,
      body.returnDate ? new Date(body.returnDate) : undefined
    );
    return NextResponse.json({ success: true, data: guarantee });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Teminat güncellenemedi";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
