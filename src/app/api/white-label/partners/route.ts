import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createReferralCode, getPartnerReferrals, getPartnerStats, claimReferral } from "@/lib/white-label";

export async function GET() {
  try {
    const user = await requireAuth();
    const [referrals, stats] = await Promise.all([
      getPartnerReferrals(user.id),
      getPartnerStats(user.id),
    ]);
    return NextResponse.json({ success: true, data: { referrals, stats } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Partner verileri alınamadı";
    if (message === "UNAUTHORIZED") return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    if (body.action === "create_code") {
      const referral = await createReferralCode(user.id);
      return NextResponse.json({ success: true, data: referral }, { status: 201 });
    }

    if (body.action === "claim" && body.referralCode) {
      const result = await claimReferral(body.referralCode, user.id);
      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json({ error: "Geçersiz işlem" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "İşlem başarısız";
    if (message === "UNAUTHORIZED") return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
