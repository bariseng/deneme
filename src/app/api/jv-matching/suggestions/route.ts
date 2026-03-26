import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { suggestPartners, suggestForTender, sanitizeMatchResult } from "@/lib/services/jv-matching";

/**
 * GET /api/jv-matching/suggestions
 * Query: ?tenderId=xxx (optional) &limit=20
 * Returns partner suggestions based on real data
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user.companyId) {
      return NextResponse.json({ error: "Firma profiliniz tanımlı değil" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const tenderId = searchParams.get("tenderId") || undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

    if (tenderId) {
      const result = await suggestForTender(tenderId, user.companyId);
      return NextResponse.json({
        success: true,
        tender: result.tender,
        partners: result.partners.map(sanitizeMatchResult),
      });
    }

    const partners = await suggestPartners(user.companyId, undefined, limit);
    return NextResponse.json({
      success: true,
      partners: partners.map(sanitizeMatchResult),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Öneri hatası";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
