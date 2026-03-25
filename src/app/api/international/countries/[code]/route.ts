import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getCountryByCode, getCountryTenderCount } from "@/lib/international";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    await requireAuth();
    const { code } = await params;

    const country = await getCountryByCode(code.toUpperCase());
    if (!country) return NextResponse.json({ error: "Ülke bulunamadı" }, { status: 404 });

    const openTenderCount = await getCountryTenderCount(code.toUpperCase());

    return NextResponse.json({ ...country, openTenderCount });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Hata";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
