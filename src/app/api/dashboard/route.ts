import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getDashboardKPIs,
  getMonthlyVolume,
  getSectorDistribution,
  getCityHeatmap,
  getPriceIndexChart,
  getPerformanceCard,
} from "@/lib/services/dashboard-metrics";
import { getIntegrationDashboard } from "@/lib/services/integration-health";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const section = searchParams.get("section");

    // Single section request for lazy loading
    if (section) {
      switch (section) {
        case "kpis":
          return NextResponse.json({
            success: true,
            data: await getDashboardKPIs(user.id, user.companyId),
          });
        case "monthly":
          return NextResponse.json({
            success: true,
            data: await getMonthlyVolume(parseInt(searchParams.get("months") || "12")),
          });
        case "sectors":
          return NextResponse.json({
            success: true,
            data: await getSectorDistribution(),
          });
        case "cities":
          return NextResponse.json({
            success: true,
            data: await getCityHeatmap(),
          });
        case "price-index":
          return NextResponse.json({
            success: true,
            data: await getPriceIndexChart(searchParams.get("sector") || undefined),
          });
        case "performance":
          return NextResponse.json({
            success: true,
            data: await getPerformanceCard(user.id, user.companyId),
          });
        case "integrations":
          return NextResponse.json({
            success: true,
            data: await getIntegrationDashboard(),
          });
        default:
          return NextResponse.json({ error: "Geçersiz section" }, { status: 400 });
      }
    }

    // Full dashboard data (parallel fetch)
    const [kpis, monthlyVolume, sectors, cities, performance, integrations] = await Promise.all([
      getDashboardKPIs(user.id, user.companyId),
      getMonthlyVolume(12),
      getSectorDistribution(),
      getCityHeatmap(),
      getPerformanceCard(user.id, user.companyId),
      getIntegrationDashboard(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        kpis,
        charts: {
          monthlyVolume,
          sectors,
          cities,
        },
        performance,
        integrations,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Dashboard verileri alınamadı";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
