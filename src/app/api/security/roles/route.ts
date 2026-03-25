import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getOrSeedPermissions, updatePermission } from "@/lib/security";

export async function GET() {
  try {
    await requireAuth();
    const permissions = await getOrSeedPermissions();
    return NextResponse.json({ success: true, data: permissions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "İzinler alınamadı";
    if (message === "UNAUTHORIZED") return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (user.role !== "ADMIN") return NextResponse.json({ error: "Admin yetkisi gerekli" }, { status: 403 });

    const body = await request.json();
    if (!body.id || body.isAllowed === undefined) return NextResponse.json({ error: "ID ve durum gerekli" }, { status: 400 });

    await updatePermission(body.id, body.isAllowed);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "İzin güncellenemedi";
    if (message === "UNAUTHORIZED") return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
