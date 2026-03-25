import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getAICreditBalance } from "@/lib/quota";

export async function GET() {
  try {
    const user = await requireAuth();
    const balance = await getAICreditBalance(user.id);

    return NextResponse.json({ success: true, data: balance });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kredi bilgisi alınamadı";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
