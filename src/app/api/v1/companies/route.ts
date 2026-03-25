import { NextRequest, NextResponse } from "next/server";
import { companies } from "@/lib/companies";

/**
 * GET /api/v1/companies
 *
 * Public RESTful endpoint for company data.
 * Query params: q, city, sector, page, limit
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const q = searchParams.get("q")?.toLowerCase();
    const city = searchParams.get("city");
    const sector = searchParams.get("sector");
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 20));

    let filtered = [...companies];

    if (q) {
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.taxNo.includes(q)
      );
    }
    if (city) filtered = filtered.filter((c) => c.city === city);
    if (sector) filtered = filtered.filter((c) => c.sectors.some((s) => s.includes(sector)));

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const items = filtered.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      data: items.map((c) => ({
        id: c.id,
        name: c.name,
        city: c.city,
        sectors: c.sectors,
        wonTenderCount: c.wonTenderCount,
        totalTenderAmount: c.totalTenderAmount,
        rating: c.rating,
      })),
      pagination: { page, limit, total, totalPages },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}
