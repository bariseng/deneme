import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createTenant, getUserTenants } from "@/lib/white-label";

export async function GET() {
  try {
    const user = await requireAuth();
    const tenants = await getUserTenants(user.id);
    return NextResponse.json({ success: true, data: tenants });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tenant'lar alınamadı";
    if (message === "UNAUTHORIZED") return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    if (!body.name || !body.slug) {
      return NextResponse.json({ error: "İsim ve slug gerekli" }, { status: 400 });
    }
    const tenant = await createTenant(user.id, body);
    return NextResponse.json({ success: true, data: tenant }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tenant oluşturulamadı";
    if (message === "UNAUTHORIZED") return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
