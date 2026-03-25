import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { parseNaturalLanguage } from "@/lib/agent/nlp-parser";
import type { Prisma } from "@/generated/prisma/client";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { query } = await request.json();

    if (!query) {
      return NextResponse.json({ error: "Sorgu zorunludur" }, { status: 400 });
    }

    const parsed = parseNaturalLanguage(query);

    // Build Prisma where clause from parsed filters
    const where: Prisma.TenderWhereInput = {
      status: "BASVURU_ACIK",
    };

    if (parsed.filters.city) {
      where.city = parsed.filters.city;
    }
    if (parsed.filters.tenderType) {
      where.tenderType = parsed.filters.tenderType as Prisma.EnumTenderTypeFilter;
    }
    if (parsed.filters.minBudget || parsed.filters.maxBudget) {
      where.estimatedCost = {};
      if (parsed.filters.minBudget) {
        where.estimatedCost.gte = parsed.filters.minBudget;
      }
      if (parsed.filters.maxBudget) {
        where.estimatedCost.lte = parsed.filters.maxBudget;
      }
    }
    if (parsed.filters.keyword) {
      where.OR = [
        { title: { contains: parsed.filters.keyword, mode: "insensitive" } },
        { description: { contains: parsed.filters.keyword, mode: "insensitive" } },
      ];
    }

    const tenders = await prisma.tender.findMany({
      where,
      orderBy: { deadline: "asc" },
      take: 20,
      select: {
        id: true,
        title: true,
        institution: true,
        city: true,
        tenderType: true,
        status: true,
        estimatedCost: true,
        deadline: true,
        publishDate: true,
      },
    });

    // Log agent task if user exists
    if (user) {
      await prisma.agentTask.create({
        data: {
          userId: user.id,
          type: "NLP_SEARCH",
          status: "COMPLETED",
          input: { query, parsed: JSON.parse(JSON.stringify(parsed)) },
          output: { resultCount: tenders.length },
          startedAt: new Date(),
          completedAt: new Date(),
        },
      });

      await prisma.searchHistory.create({
        data: { userId: user.id, query, resultCount: tenders.length },
      });
    }

    // Generate explanation
    const filterDesc: string[] = [];
    if (parsed.filters.city) filterDesc.push(`Şehir: ${parsed.filters.city}`);
    if (parsed.filters.tenderType) filterDesc.push(`Tür: ${parsed.filters.tenderType}`);
    if (parsed.filters.minBudget) filterDesc.push(`Min bütçe: ${(parsed.filters.minBudget / 1_000_000).toFixed(1)}M ₺`);
    if (parsed.filters.maxBudget) filterDesc.push(`Max bütçe: ${(parsed.filters.maxBudget / 1_000_000).toFixed(1)}M ₺`);
    if (parsed.filters.keyword) filterDesc.push(`Anahtar kelime: ${parsed.filters.keyword}`);

    return NextResponse.json({
      success: true,
      data: {
        intent: parsed,
        filters: filterDesc,
        tenders,
        totalCount: tenders.length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Arama yapılamadı";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
