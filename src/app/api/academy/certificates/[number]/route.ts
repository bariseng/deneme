import { NextRequest, NextResponse } from "next/server";
import { verifyCertificate } from "@/lib/academy";

// Public endpoint — sertifika doğrulama
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ number: string }> }
) {
  try {
    const { number } = await params;
    const cert = await verifyCertificate(number);
    if (!cert) return NextResponse.json({ error: "Sertifika bulunamadı", valid: false }, { status: 404 });
    return NextResponse.json({ ...cert, valid: true });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
