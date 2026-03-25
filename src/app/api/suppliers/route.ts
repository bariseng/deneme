import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { rateSupplier, getUserRatings } from "@/lib/contract-manager";

export async function GET() {
  try {
    const user = await requireAuth();
    const ratings = await getUserRatings(user.id);
    return NextResponse.json({ success: true, data: ratings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Değerlendirmeler alınamadı";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    if (!body.supplierName || !body.deliveryScore || !body.qualityScore || !body.communicationScore || !body.priceScore) {
      return NextResponse.json({ error: "Gerekli alanlar eksik" }, { status: 400 });
    }

    const rating = await rateSupplier(user.id, {
      supplierName: body.supplierName,
      supplierTaxNo: body.supplierTaxNo,
      contractTitle: body.contractTitle,
      deliveryScore: parseFloat(body.deliveryScore),
      qualityScore: parseFloat(body.qualityScore),
      communicationScore: parseFloat(body.communicationScore),
      priceScore: parseFloat(body.priceScore),
      comment: body.comment,
    });

    return NextResponse.json({ success: true, data: rating }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Değerlendirme kaydedilemedi";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
