import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getFinancialPartners, seedFinancialPartners, getFinanceStats } from "@/lib/finance";
import type { FinancialPartnerType } from "@/generated/prisma/client";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "stats") {
      const stats = await getFinanceStats(user.id);
      return NextResponse.json(stats);
    }

    if (action === "seed") {
      await seedFinancialPartners();
      return NextResponse.json({ success: true });
    }

    const type = searchParams.get("type") as FinancialPartnerType | null;
    const partners = await getFinancialPartners(type || undefined);
    return NextResponse.json(partners);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Oturum açın" }, { status: 401 });
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
