import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getIpWhitelist, addIpWhitelist, removeIpWhitelist } from "@/lib/security";

export async function GET() {
  try {
    const user = await requireAuth();
    if (!user.companyId) return NextResponse.json({ success: true, data: [] });
    const list = await getIpWhitelist(user.companyId);
    return NextResponse.json({ success: true, data: list });
  } catch (error) {
    const message = error instanceof Error ? error.message : "IP listesi alınamadı";
    if (message === "UNAUTHORIZED") return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user.companyId) return NextResponse.json({ error: "Firma hesabı gerekli" }, { status: 400 });

    const body = await request.json();
    if (!body.ipRange) return NextResponse.json({ error: "IP adresi gerekli" }, { status: 400 });

    const entry = await addIpWhitelist(user.companyId, body.ipRange, body.description);
    return NextResponse.json({ success: true, data: entry }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "IP eklenemedi";
    if (message === "UNAUTHORIZED") return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID gerekli" }, { status: 400 });
    await removeIpWhitelist(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "IP silinemedi";
    if (message === "UNAUTHORIZED") return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
