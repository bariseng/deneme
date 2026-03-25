import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getGuaranteeRequestById } from "@/lib/finance";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const request = await getGuaranteeRequestById(id);
    if (!request) return NextResponse.json({ error: "Talep bulunamadı" }, { status: 404 });
    return NextResponse.json(request);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Oturum açın" }, { status: 401 });
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
