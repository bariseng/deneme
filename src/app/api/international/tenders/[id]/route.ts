import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getInternationalTenderById } from "@/lib/international";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;

    const tender = await getInternationalTenderById(id);
    if (!tender) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

    return NextResponse.json(tender);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Hata";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
