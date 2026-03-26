import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { tenderFilterSchema } from "@/lib/validations/tender";
import { Prisma } from "@/generated/prisma/client";
import { cacheGet, CACHE_KEYS, trackCacheHit, trackCacheMiss } from "@/lib/cache/redis";
import { TENDER_LIST_SELECT } from "@/lib/db/query-optimizer";
import { recordApiLatency } from "@/lib/monitoring/metrics";

export async function GET(request: NextRequest) {
  const start = Date.now();
  try {
    const { searchParams } = request.nextUrl;
    const params = Object.fromEntries(searchParams.entries());
    const parsed = tenderFilterSchema.safeParse(params);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { q, city, type, status, budgetMin, budgetMax, sort, order, page, limit } = parsed.data;

    const where: Prisma.TenderWhereInput = {};

    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { institution: { contains: q, mode: "insensitive" } },
        { ekapNo: { contains: q, mode: "insensitive" } },
      ];
    }

    if (city) where.city = city;
    if (type) where.tenderType = type as Prisma.EnumTenderTypeFilter["equals"];
    if (status) where.status = status as Prisma.EnumTenderStatusFilter["equals"];
    if (budgetMin || budgetMax) {
      where.estimatedCost = {};
      if (budgetMin) where.estimatedCost.gte = budgetMin;
      if (budgetMax) where.estimatedCost.lte = budgetMax;
    }

    const orderBy: Prisma.TenderOrderByWithRelationInput = {};
    const sortField = sort || "publishDate";
    const sortOrder = order || "desc";

    if (sortField === "deadline") orderBy.deadline = sortOrder;
    else if (sortField === "estimatedCost") orderBy.estimatedCost = sortOrder;
    else if (sortField === "title") orderBy.title = sortOrder;
    else if (sortField === "viewCount") orderBy.viewCount = sortOrder;
    else orderBy.publishDate = sortOrder;

    const currentPage = page ?? 1;
    const pageSize = limit ?? 20;
    const skip = (currentPage - 1) * pageSize;

    // Cache key based on query params
    const cacheKey = `${CACHE_KEYS.TENDER_LIST}:${JSON.stringify({ where, orderBy, skip, take: pageSize })}`;

    const result = await cacheGet(
      cacheKey,
      async () => {
        trackCacheMiss();
        const [data, total] = await Promise.all([
          prisma.tender.findMany({
            where,
            orderBy,
            skip,
            take: pageSize,
            select: {
              ...TENDER_LIST_SELECT,
              documents: { select: { id: true, name: true, category: true, fileSize: true } },
              _count: { select: { favorites: true, applications: true } },
            },
          }),
          prisma.tender.count({ where }),
        ]);
        return { data, total };
      },
      { ttl: 120, prefix: "tenders" }, // 2-minute cache
    );

    trackCacheHit();

    const response = NextResponse.json({
      success: true,
      data: result.data,
      pagination: {
        total: result.total,
        page: currentPage,
        limit: pageSize,
        pages: Math.ceil(result.total / pageSize),
        hasNext: skip + pageSize < result.total,
      },
    });

    // Cache-Control: public for CDN caching
    response.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=120");
    recordApiLatency("/api/tenders", "GET", Date.now() - start, 200);

    return response;
  } catch (error) {
    recordApiLatency("/api/tenders", "GET", Date.now() - start, 500);
    const message = error instanceof Error ? error.message : "İhale listesi alınamadı";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
