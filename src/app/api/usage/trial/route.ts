import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { startTrial } from "@/lib/quota";

export async function POST() {
  try {
    const user = await requireAuth();
    const result = await startTrial(user.id);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        plan: "PRO",
        endDate: result.endDate,
        daysLeft: 14,
        message: "14 günlük Profesyonel deneme süresi başlatıldı!",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Deneme başlatılamadı";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
