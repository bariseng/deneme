import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getExpiringGuarantees } from "@/lib/contract-manager";

export async function GET() {
  try {
    const user = await requireAuth();
    const guarantees = await getExpiringGuarantees(user.id, 30);
    return NextResponse.json({ success: true, data: guarantees });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Teminat verileri alınamadı";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
