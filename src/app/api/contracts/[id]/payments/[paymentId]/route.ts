import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { updatePaymentStatus } from "@/lib/contract-manager";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
  try {
    const user = await requireAuth();
    const { id, paymentId } = await params;
    const body = await request.json();

    if (!body.status) {
      return NextResponse.json({ error: "Durum gerekli" }, { status: 400 });
    }

    const payment = await updatePaymentStatus(paymentId, id, user.id, body.status);
    return NextResponse.json({ success: true, data: payment });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Hakediş güncellenemedi";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
