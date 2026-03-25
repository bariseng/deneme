import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getUserAlert, upsertUserAlert } from "@/lib/legal-scanner";

export async function GET() {
  try {
    const user = await requireAuth();
    const alert = await getUserAlert(user.id);
    return NextResponse.json(alert || { categories: [], impactLevels: [], isActive: false });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Hata";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { categories, impactLevels, isActive } = body;

    const alert = await upsertUserAlert(
      user.id,
      categories || [],
      impactLevels || [],
      isActive !== false
    );

    return NextResponse.json(alert);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Hata";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
