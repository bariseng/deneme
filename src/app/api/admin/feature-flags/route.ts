import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getAllFlags, getDataSource, type FeatureFlag } from "@/lib/feature-flags";

export async function GET(_request: NextRequest) {
  try {
    await requireAdmin();

    const flags = getAllFlags();
    return NextResponse.json({ success: true, data: flags });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Hata";
    if (message === "UNAUTHORIZED") return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    if (message === "FORBIDDEN") return NextResponse.json({ error: "Yetkiniz yok" }, { status: 403 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const { flag, userId } = await request.json();
    if (!flag) {
      return NextResponse.json({ error: "flag parametresi gerekli" }, { status: 400 });
    }

    const source = getDataSource(flag as FeatureFlag, userId);
    return NextResponse.json({
      success: true,
      data: { flag, source, userId: userId || null },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Hata";
    if (message === "UNAUTHORIZED") return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    if (message === "FORBIDDEN") return NextResponse.json({ error: "Yetkiniz yok" }, { status: 403 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
