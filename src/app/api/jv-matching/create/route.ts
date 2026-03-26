import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createJvRequest, findMatches } from "@/lib/jv-matching";

/**
 * POST /api/jv-matching/create
 * Body: { title, description, requiredSpecialty, requiredExperienceAmount, city, tenderId?, autoMatch? }
 * Creates a JV request and optionally triggers matching
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user.companyId) {
      return NextResponse.json({ error: "Firma profiliniz tanımlı değil" }, { status: 400 });
    }

    const body = await request.json();
    const { title, description, requiredSpecialty, requiredExperienceAmount, city, tenderId, autoMatch } = body;

    if (!title || !description || !requiredSpecialty || !requiredExperienceAmount || !city) {
      return NextResponse.json({ error: "Zorunlu alanlar eksik" }, { status: 400 });
    }

    const jvRequest = await createJvRequest({
      companyId: user.companyId,
      tenderId: tenderId || undefined,
      title,
      description,
      requiredSpecialty,
      requiredExperienceAmount: Number(requiredExperienceAmount),
      city,
    });

    // Optionally run matching immediately
    let matches = null;
    if (autoMatch) {
      matches = await findMatches(jvRequest.id);
    }

    return NextResponse.json({
      success: true,
      data: jvRequest,
      ...(matches && { matches, matchCount: matches.length }),
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ortaklık talebi oluşturma hatası";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
