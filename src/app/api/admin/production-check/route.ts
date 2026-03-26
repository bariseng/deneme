import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { runProductionChecklist } from "@/lib/production/checklist";

export async function GET(_request: NextRequest) {
  try {
    await requireAdmin();

    const result = await runProductionChecklist();
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Hata";
    if (message === "UNAUTHORIZED") return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    if (message === "FORBIDDEN") return NextResponse.json({ error: "Yetkiniz yok" }, { status: 403 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
