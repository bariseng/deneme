import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { queryAuditLogs, archiveOldLogs } from "@/lib/security/audit-log";
import { getAuditStats } from "@/lib/security";
import { verifyCronRequest } from "@/lib/security/input-sanitizer";

/**
 * GET /api/security/audit — Query audit logs
 * POST /api/security/audit — Cron: archive old logs (90 day retention)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const statsOnly = searchParams.get("stats");

    if (statsOnly === "true") {
      const stats = await getAuditStats(user.role === "ADMIN" ? undefined : user.id);
      return NextResponse.json({ success: true, data: stats });
    }

    const result = await queryAuditLogs({
      userId: user.role === "ADMIN" ? searchParams.get("userId") || undefined : user.id,
      action: searchParams.get("action") || undefined,
      entityType: searchParams.get("entityType") || undefined,
      severity: (searchParams.get("severity") as "info" | "warning" | "critical") || undefined,
      from: searchParams.get("from") ? new Date(searchParams.get("from") as string) : undefined,
      to: searchParams.get("to") ? new Date(searchParams.get("to") as string) : undefined,
      page: parseInt(searchParams.get("page") || "1"),
      limit: parseInt(searchParams.get("limit") || "50"),
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Denetim kayıtları alınamadı";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const isCron = verifyCronRequest(request);
    if (!isCron) {
      await requireAdmin();
    }

    const result = await archiveOldLogs();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Arşivleme hatası";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Yetkiniz yok" }, { status: 403 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
