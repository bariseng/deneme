import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createApiKey, getUserApiKeys } from "@/lib/white-label";

export async function GET() {
  try {
    const user = await requireAuth();
    const keys = await getUserApiKeys(user.id);
    return NextResponse.json({ success: true, data: keys });
  } catch (error) {
    const message = error instanceof Error ? error.message : "API anahtarları alınamadı";
    if (message === "UNAUTHORIZED") return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ error: "Anahtar adı gerekli" }, { status: 400 });
    }
    const key = await createApiKey(user.id, {
      name: body.name,
      tenantId: body.tenantId,
      permissions: body.permissions,
      rateLimit: body.rateLimit ? parseInt(body.rateLimit) : undefined,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    });
    return NextResponse.json({ success: true, data: key }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "API anahtarı oluşturulamadı";
    if (message === "UNAUTHORIZED") return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
