import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { generateProfileEmbedding } from "@/lib/agent/matcher";

export async function GET() {
  try {
    const user = await requireAuth();
    const profile = await prisma.firmProfile.findUnique({
      where: { userId: user.id },
    });

    return NextResponse.json({ success: true, data: profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Profil alınamadı";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const {
      companyName,
      sectors,
      cities,
      maxBudget,
      minBudget,
      preferredTypes,
      experienceYears,
      keywords,
    } = body;

    if (!companyName || !sectors?.length || !cities?.length) {
      return NextResponse.json(
        { error: "Firma adı, sektörler ve şehirler zorunludur" },
        { status: 400 }
      );
    }

    const embedding = generateProfileEmbedding({ sectors, keywords: keywords || [], companyName });

    const profile = await prisma.firmProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        companyName,
        sectors,
        cities,
        maxBudget: maxBudget || 0,
        minBudget: minBudget || 0,
        preferredTypes: preferredTypes || [],
        experienceYears: experienceYears || 0,
        keywords: keywords || [],
        embedding,
      },
      update: {
        companyName,
        sectors,
        cities,
        maxBudget: maxBudget || 0,
        minBudget: minBudget || 0,
        preferredTypes: preferredTypes || [],
        experienceYears: experienceYears || 0,
        keywords: keywords || [],
        embedding,
      },
    });

    return NextResponse.json({ success: true, data: profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Profil kaydedilemedi";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
