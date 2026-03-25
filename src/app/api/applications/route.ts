import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

const createApplicationSchema = z.object({
  tenderId: z.string().min(1),
  bidAmount: z.coerce.number().optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }

    const status = request.nextUrl.searchParams.get("status");

    const where: Record<string, unknown> = { userId: user.id };
    if (status) where.status = status;

    const applications = await prisma.application.findMany({
      where,
      include: {
        tender: {
          select: {
            id: true,
            title: true,
            institution: true,
            city: true,
            tenderType: true,
            status: true,
            estimatedCost: true,
            deadline: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ success: true, data: applications });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Başvurular alınamadı";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createApplicationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const existing = await prisma.application.findUnique({
      where: { userId_tenderId: { userId: user.id, tenderId: parsed.data.tenderId } },
    });

    if (existing) {
      return NextResponse.json({ error: "Bu ihaleye zaten başvurdunuz" }, { status: 409 });
    }

    const application = await prisma.application.create({
      data: {
        userId: user.id,
        tenderId: parsed.data.tenderId,
        bidAmount: parsed.data.bidAmount,
        notes: parsed.data.notes,
      },
    });

    return NextResponse.json({ success: true, data: application }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Başvuru oluşturulamadı";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }

    const { id, status, bidAmount, notes } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "Başvuru ID zorunludur" }, { status: 400 });
    }

    const application = await prisma.application.findFirst({
      where: { id, userId: user.id },
    });

    if (!application) {
      return NextResponse.json({ error: "Başvuru bulunamadı" }, { status: 404 });
    }

    const updated = await prisma.application.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(bidAmount !== undefined && { bidAmount }),
        ...(notes !== undefined && { notes }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Başvuru güncellenemedi";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
