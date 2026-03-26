import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { analyzePair, sanitizePairAnalysis } from "@/lib/services/jv-matching";

/**
 * POST /api/jv-matching/analyze
 * Body: { companyIdA, companyIdB, tenderId? }
 * Returns detailed compatibility analysis between two companies
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { companyIdA, companyIdB, tenderId } = await request.json();

    if (!companyIdA || !companyIdB) {
      return NextResponse.json(
        { error: "companyIdA ve companyIdB zorunludur" },
        { status: 400 },
      );
    }

    if (companyIdA === companyIdB) {
      return NextResponse.json(
        { error: "Aynı firmayı karşılaştıramazsınız" },
        { status: 400 },
      );
    }

    const analysis = await analyzePair(companyIdA, companyIdB, tenderId || undefined);
    return NextResponse.json({
      success: true,
      data: sanitizePairAnalysis(analysis),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analiz hatası";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }
    if (message === "Firma bulunamadı") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
