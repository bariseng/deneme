import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAgreement, signNda, getAgreement } from "@/lib/jv-matching";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const agreement = await getAgreement(id);
    if (!agreement) return NextResponse.json({ error: "Anlaşma bulunamadı" }, { status: 404 });
    return NextResponse.json(agreement);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Oturum açın" }, { status: 401 });
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const { agreementType, partyCompanyIds, partyRoles, partyShares } = await req.json();

    if (!agreementType || !partyCompanyIds?.length) {
      return NextResponse.json({ error: "Zorunlu alanlar eksik" }, { status: 400 });
    }

    const agreement = await createAgreement({
      requestId: id,
      agreementType,
      partyCompanyIds,
      partyRoles,
      partyShares,
    });

    return NextResponse.json(agreement, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Oturum açın" }, { status: 401 });
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const { action, agreementId } = await req.json();

    if (action === "sign_nda" && agreementId) {
      const signed = await signNda(agreementId);
      return NextResponse.json(signed);
    }

    return NextResponse.json({ error: "Geçersiz işlem" }, { status: 400 });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Oturum açın" }, { status: 401 });
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
