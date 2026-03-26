import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { cancelSubscription } from "@/lib/services/payment";

/**
 * POST /api/payments/cancel — Cancel active subscription
 */
export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const result = await cancelSubscription(user.id);
    return NextResponse.json({ success: result.success });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "İptal hatası";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
