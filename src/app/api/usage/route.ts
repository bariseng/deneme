import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getUsageSummary, ensureQuotas } from "@/lib/quota";

export async function GET() {
  try {
    const user = await requireAuth();

    // Ensure quotas exist for this user
    await ensureQuotas(user.id, user.plan);

    const summary = await getUsageSummary(user.id);

    return NextResponse.json({
      success: true,
      data: {
        plan: user.plan,
        ...summary,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kullanım bilgisi alınamadı";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
