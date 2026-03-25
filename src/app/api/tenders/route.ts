import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { tenderFilterSchema } from "@/lib/validations/tender";
import { Prisma } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
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
        { description: { contains: q, mode: "insensitive" } },
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

    const skip = ((page ?? 1) - 1) * (limit ?? 20);
    const take = limit ?? 20;

    const [data, total] = await Promise.all([
      prisma.tender.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          documents: { select: { id: true, name: true, category: true, fileSize: true } },
          _count: { select: { favorites: true, applications: true } },
        },
      }),
      prisma.tender.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        total,
        page: page ?? 1,
        limit: take,
        pages: Math.ceil(total / take),
        hasNext: skip + take < total,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "İhale listesi alınamadı";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
