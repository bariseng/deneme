import { NextRequest, NextResponse } from "next/server";
import { tenders } from "@/lib/data";

/**
 * GET /api/v1/tenders
 *
 * Public RESTful endpoint for tender data.
 * Supports filtering, pagination, and sorting.
 *
 * Query params:
 *   q        - Full-text search
 *   city     - Filter by city
 *   category - Filter by category
 *   status   - Filter by status (active|closed|upcoming)
 *   minBudget / maxBudget - Budget range
 *   page     - Page number (default: 1)
 *   limit    - Items per page (default: 20, max: 100)
 *   sort     - Sort field (deadline|publishDate|estimatedCostValue)
 *   order    - Sort order (asc|desc)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const q = searchParams.get("q")?.toLowerCase();
    const city = searchParams.get("city");
    const category = searchParams.get("category");
    const status = searchParams.get("status") as "active" | "closed" | "upcoming" | null;
    const minBudget = searchParams.get("minBudget") ? Number(searchParams.get("minBudget")) : null;
    const maxBudget = searchParams.get("maxBudget") ? Number(searchParams.get("maxBudget")) : null;
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));
    const sort = searchParams.get("sort") || "publishDate";
    const order = searchParams.get("order") === "asc" ? "asc" : "desc";

    let filtered = [...tenders];

    if (q) {
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.institution.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.ekapNo.toLowerCase().includes(q)
      );
    }
    if (city) filtered = filtered.filter((t) => t.city === city);
    if (category) filtered = filtered.filter((t) => t.category === category);
    if (status) filtered = filtered.filter((t) => t.status === status);
    if (minBudget !== null) filtered = filtered.filter((t) => t.estimatedCostValue >= minBudget);
    if (maxBudget !== null) filtered = filtered.filter((t) => t.estimatedCostValue <= maxBudget);

    // Sort
    filtered.sort((a, b) => {
      const aVal = a[sort as keyof typeof a] ?? "";
      const bVal = b[sort as keyof typeof b] ?? "";
      const cmp = String(aVal).localeCompare(String(bVal), "tr", { numeric: true });
      return order === "asc" ? cmp : -cmp;
    });

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const items = filtered.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      data: items.map((t) => ({
        id: t.id,
        title: t.title,
        institution: t.institution,
        institutionType: t.institutionType,
        city: t.city,
        category: t.category,
        type: t.type,
        estimatedCost: t.estimatedCost,
        estimatedCostValue: t.estimatedCostValue,
        publishDate: t.publishDate,
        deadline: t.deadline,
        status: t.status,
        ekapNo: t.ekapNo,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}
