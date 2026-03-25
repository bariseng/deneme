import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getAuditLogs, getAuditStats } from "@/lib/security";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const statsOnly = searchParams.get("stats");

    if (statsOnly === "true") {
      const stats = await getAuditStats(user.role === "ADMIN" ? undefined : user.id);
      return NextResponse.json({ success: true, data: stats });
    }

    const filters = {
      userId: user.role === "ADMIN" ? searchParams.get("userId") || undefined : user.id,
      action: searchParams.get("action") || undefined,
      entityType: searchParams.get("entityType") || undefined,
      severity: searchParams.get("severity") || undefined,
      page: parseInt(searchParams.get("page") || "1"),
      limit: parseInt(searchParams.get("limit") || "50"),
    };

    const data = await getAuditLogs(filters);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Denetim kayıtları alınamadı";
    if (message === "UNAUTHORIZED") return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
