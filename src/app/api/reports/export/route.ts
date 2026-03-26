import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { getDashboardKPIs, getMonthlyVolume } from "@/lib/services/dashboard-metrics";
import { getRevenueReport, getUserActivityReport } from "@/lib/services/admin-reports";
import {
  generateExcel,
  generatePdfHtml,
  buildKpiReport,
  buildRevenueReport,
  buildTenderReport,
  buildUserActivityReport,
  type ReportRow,
} from "@/lib/services/report-export";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/reports/export
 * Query: type=kpi|revenue|tenders|users & format=xlsx|pdf
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get("type") || "kpi";
    const format = searchParams.get("format") || "xlsx";

    // Admin-only reports
    if (reportType === "revenue" || reportType === "users") {
      const admin = await requireAdmin();
      return await handleAdminExport(reportType, format, admin.id);
    }

    // User reports
    const user = await requireAuth();
    return await handleUserExport(reportType, format, user.id, user.companyId || undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Export hatası";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }
    if (message === "FORBIDDEN") {
      return NextResponse.json({ error: "Bu rapora erişim yetkiniz yok" }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function handleUserExport(
  reportType: string,
  format: string,
  userId: string,
  companyId?: string,
): Promise<NextResponse> {
  const dateStr = new Date().toISOString().slice(0, 10);

  if (reportType === "kpi") {
    const kpis = await getDashboardKPIs(userId, companyId);
    const config = buildKpiReport(kpis as unknown as Record<string, unknown>);
    return exportResponse(config, format, `ihalepro-kpi-${dateStr}`);
  }

  if (reportType === "tenders") {
    const tenders = await prisma.tender.findMany({
      where: { status: "BASVURU_ACIK" },
      select: {
        title: true, institution: true, city: true,
        deadline: true, estimatedCost: true,
      },
      orderBy: { deadline: "asc" },
      take: 500,
    });
    const config = buildTenderReport(
      tenders.map((t) => ({
        title: t.title,
        institution: t.institution,
        city: t.city,
        deadline: t.deadline.toLocaleDateString("tr-TR"),
        estimatedCost: Number(t.estimatedCost || 0),
      })),
    );
    return exportResponse(config, format, `ihalepro-ihaleler-${dateStr}`);
  }

  if (reportType === "monthly") {
    const monthly = await getMonthlyVolume(12);
    const config = {
      title: "Aylık İhale Hacmi",
      columns: [
        { key: "month", label: "Ay", width: 12 },
        { key: "count", label: "İhale Sayısı", width: 15 },
        { key: "totalBudget", label: "Toplam Bütçe (TL)", width: 20 },
      ],
      rows: monthly.map((m) => ({ month: m.month, count: m.count, totalBudget: m.totalBudget }) as ReportRow),
      generatedAt: new Date(),
    };
    return exportResponse(config, format, `ihalepro-aylik-hacim-${dateStr}`);
  }

  return NextResponse.json({ error: "Geçersiz rapor tipi" }, { status: 400 });
}

async function handleAdminExport(
  reportType: string,
  format: string,
  _adminId: string,
): Promise<NextResponse> {
  const dateStr = new Date().toISOString().slice(0, 10);

  if (reportType === "revenue") {
    const revenue = await getRevenueReport();
    const config = buildRevenueReport(revenue.monthlyRevenue);
    return exportResponse(config, format, `ihalepro-gelir-${dateStr}`);
  }

  if (reportType === "users") {
    const activity = await getUserActivityReport();
    const config = buildUserActivityReport(activity.topActiveUsers);
    return exportResponse(config, format, `ihalepro-kullanici-aktivite-${dateStr}`);
  }

  return NextResponse.json({ error: "Geçersiz rapor tipi" }, { status: 400 });
}

function exportResponse(
  config: Parameters<typeof generateExcel>[0],
  format: string,
  filename: string,
): NextResponse {
  if (format === "pdf") {
    const html = generatePdfHtml(config);
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.html"`,
      },
    });
  }

  // Default: Excel
  const buffer = generateExcel(config);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
    },
  });
}
