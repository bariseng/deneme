import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateDataQualityReport } from "@/lib/data-quality/analyzer";

export async function GET(_request: NextRequest) {
  try {
    await requireAdmin();

    // Fetch all data for analysis
    const [tenders, companies, priceIndices] = await Promise.all([
      prisma.tender.findMany({
        select: {
          title: true,
          institution: true,
          city: true,
          tenderType: true,
          status: true,
          ekapNo: true,
          ilanNo: true,
          description: true,
          requirements: true,
          estimatedCost: true,
          guaranteeRate: true,
          publishDate: true,
          deadline: true,
          openingDate: true,
          latitude: true,
          longitude: true,
          contactPerson: true,
          contactPhone: true,
          contactEmail: true,
          viewCount: true,
          source: true,
        },
      }),
      prisma.company.findMany({
        select: {
          name: true,
          taxNumber: true,
          taxOffice: true,
          address: true,
          city: true,
          phone: true,
          email: true,
          website: true,
          sector: true,
          description: true,
          foundedYear: true,
          employeeCount: true,
        },
      }),
      prisma.priceIndex.findMany({
        select: {
          sector: true,
          item: true,
          unit: true,
          price: true,
          prevPrice: true,
          change: true,
          month: true,
          source: true,
        },
      }),
    ]);

    const report = generateDataQualityReport({
      tenders: tenders as Record<string, unknown>[],
      companies: companies as Record<string, unknown>[],
      priceIndices: priceIndices as Record<string, unknown>[],
    });

    return NextResponse.json({ success: true, data: report });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Hata";
    if (message === "UNAUTHORIZED") return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    if (message === "FORBIDDEN") return NextResponse.json({ error: "Yetkiniz yok" }, { status: 403 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
