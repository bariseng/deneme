import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { terminateSession } from "@/lib/security";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    await terminateSession(id, user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Oturum sonlandırılamadı";
    if (message === "UNAUTHORIZED") return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
