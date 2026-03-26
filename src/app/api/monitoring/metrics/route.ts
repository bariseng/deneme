import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getPerformanceMetrics } from "@/lib/monitoring/metrics";
import { getCacheStats } from "@/lib/cache/redis";

export async function GET(_request: NextRequest) {
  try {
    await requireAdmin();

    const metrics = getPerformanceMetrics();
    const cacheStats = getCacheStats();

    return NextResponse.json({
      success: true,
      data: {
        ...metrics,
        cache: cacheStats,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Metrik hatası";
    if (message === "UNAUTHORIZED") return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    if (message === "FORBIDDEN") return NextResponse.json({ error: "Yetkiniz yok" }, { status: 403 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
