import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { queryCompetitorScore, getQueryHistory } from "@/lib/financial-health";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Premium check
    if (user.plan === "FREE") {
      return NextResponse.json(
        { error: "Rakip sorgulama premium üyelik gerektirir" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { targetCompanyName, targetTaxNumber } = body;

    if (!targetCompanyName) {
      return NextResponse.json({ error: "Firma adı gereklidir" }, { status: 400 });
    }

    const score = await queryCompetitorScore(user.id, targetCompanyName, targetTaxNumber);
    return NextResponse.json(score);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Hata";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  try {
    const user = await requireAuth();
    const history = await getQueryHistory(user.id);
    return NextResponse.json(history);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Hata";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
