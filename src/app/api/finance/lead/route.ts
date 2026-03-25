import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createLeadLog, selectOffer } from "@/lib/finance";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { partnerId, offerType, offerId, amount } = await req.json();

    if (!partnerId || !offerType || !offerId || !amount) {
      return NextResponse.json({ error: "Zorunlu alanlar eksik" }, { status: 400 });
    }

    // Lead kaydı oluştur
    const lead = await createLeadLog({
      userId: user.id,
      partnerId,
      offerType,
      offerId,
      amount: Number(amount),
    });

    // Teklifi seçili olarak işaretle
    await selectOffer(offerType, offerId);

    return NextResponse.json(lead, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Oturum açın" }, { status: 401 });
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
