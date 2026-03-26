import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getUserActivityReport, getRevenueReport, getSystemMetrics } from "@/lib/services/admin-reports";

/**
 * GET /api/stats/overview — Admin-only system overview
 * Query: ?section=users|revenue|system (optional, returns all if omitted)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const section = new URL(request.url).searchParams.get("section");

    if (section === "users") {
      return NextResponse.json({ success: true, data: await getUserActivityReport() });
    }
    if (section === "revenue") {
      return NextResponse.json({ success: true, data: await getRevenueReport() });
    }
    if (section === "system") {
      return NextResponse.json({ success: true, data: await getSystemMetrics() });
    }

    const [users, revenue, system] = await Promise.all([
      getUserActivityReport(),
      getRevenueReport(),
      getSystemMetrics(),
    ]);

    return NextResponse.json({ success: true, data: { users, revenue, system } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Rapor alınamadı";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }
    if (message === "FORBIDDEN") {
      return NextResponse.json({ error: "Bu sayfaya erişim yetkiniz yok" }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
