import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const from = request.nextUrl.searchParams.get("from");
    const to = request.nextUrl.searchParams.get("to");

    const where: Record<string, unknown> = {};
    if (from || to) {
      where.date = {};
      if (from) (where.date as Record<string, unknown>).gte = new Date(from);
      if (to) (where.date as Record<string, unknown>).lte = new Date(to);
    }

    const stats = await prisma.dailyStats.findMany({
      where,
      orderBy: { date: "asc" },
    });

    // UTF-8 BOM for Turkish Excel
    const BOM = "\uFEFF";
    const header = "Tarih;Toplam İhale;Yeni İhale;Kapanan İhale;Toplam Bütçe;Ort. Bütçe;Toplam Kullanıcı;Aktif Kullanıcı;Arama Sayısı;Sayfa Görüntüleme";
    const rows = stats.map((s) =>
      [
        new Date(s.date).toLocaleDateString("tr-TR"),
        s.totalTenders,
        s.newTenders,
        s.closingTenders,
        s.totalBudget.toString(),
        s.avgBudget.toString(),
        s.totalUsers,
        s.activeUsers,
        s.totalSearches,
        s.totalPageViews,
      ].join(";")
    );

    const csv = BOM + header + "\n" + rows.join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ihalepro-istatistik-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "CSV oluşturulamadı";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
