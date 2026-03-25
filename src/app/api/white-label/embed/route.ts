import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public embed endpoint — returns tender list as JSON for embedding
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const apiKey = searchParams.get("key") || request.headers.get("x-api-key");
  const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);
  const city = searchParams.get("city");
  const type = searchParams.get("type");

  if (!apiKey) {
    return NextResponse.json({ error: "API anahtarı gerekli" }, { status: 401 });
  }

  // Validate API key (simplified — in production hash and compare)
  const keyRecord = await prisma.apiKey.findFirst({
    where: {
      prefix: apiKey.substring(0, 12),
      isActive: true,
      permissions: { has: "tenders:read" },
    },
  });

  if (!keyRecord) {
    return NextResponse.json({ error: "Geçersiz API anahtarı" }, { status: 403 });
  }

  // Check expiry
  if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
    return NextResponse.json({ error: "API anahtarı süresi dolmuş" }, { status: 403 });
  }

  const where: Record<string, unknown> = { status: "BASVURU_ACIK" };
  if (city) where.city = city;
  if (type) where.tenderType = type;

  const tenders = await prisma.tender.findMany({
    where,
    select: {
      id: true,
      title: true,
      institution: true,
      city: true,
      tenderType: true,
      deadline: true,
      estimatedCost: true,
      publishDate: true,
    },
    orderBy: { publishDate: "desc" },
    take: limit,
  });

  // CORS headers for embedding
  const response = NextResponse.json({
    success: true,
    data: JSON.parse(JSON.stringify(tenders)),
    count: tenders.length,
  });

  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET");
  response.headers.set("Access-Control-Allow-Headers", "x-api-key");

  return response;
}
