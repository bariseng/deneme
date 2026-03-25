import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getLegalUpdateById, generateImpactAnalysis } from "@/lib/legal-scanner";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Premium check
    if (user.plan === "FREE") {
      return NextResponse.json(
        { error: "Etki analizi premium üyelik gerektirir" },
        { status: 403 }
      );
    }

    const { updateId } = await request.json();
    if (!updateId) return NextResponse.json({ error: "updateId gerekli" }, { status: 400 });

    const update = await getLegalUpdateById(updateId);
    if (!update) return NextResponse.json({ error: "Güncelleme bulunamadı" }, { status: 404 });

    // Get company sector
    let sector: string | undefined;
    if (user.companyId) {
      const company = await prisma.company.findUnique({
        where: { id: user.companyId },
        select: { sector: true },
      });
      sector = company?.sector || undefined;
    }

    const analysis = generateImpactAnalysis(update.title, update.rawContent || "", sector);
    return NextResponse.json({ analysis });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Hata";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
