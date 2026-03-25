import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

/**
 * GET /api/projects — List user's projects
 */
export async function GET() {
  try {
    const user = await requireAuth();

    const projects = await prisma.project.findMany({
      where: { ownerId: user.id },
      include: {
        tender: {
          select: {
            id: true,
            title: true,
            institution: true,
            city: true,
            deadline: true,
            estimatedCost: true,
            tenderType: true,
          },
        },
        tasks: {
          select: { id: true, status: true },
        },
        _count: { select: { comments: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    const data = projects.map((p) => ({
      ...p,
      taskSummary: {
        total: p.tasks.length,
        completed: p.tasks.filter((t) => t.status === "TAMAMLANDI").length,
        inProgress: p.tasks.filter((t) => t.status === "DEVAM_EDIYOR").length,
        pending: p.tasks.filter((t) => t.status === "BEKLIYOR").length,
      },
      tasks: undefined,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Projeler yüklenemedi";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/projects — Create project from tender
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { tenderId, title } = await request.json();

    if (!tenderId) {
      return NextResponse.json({ error: "İhale ID zorunludur" }, { status: 400 });
    }

    // Check if project already exists for this tender+user
    const existing = await prisma.project.findUnique({
      where: { tenderId_ownerId: { tenderId, ownerId: user.id } },
    });

    if (existing) {
      return NextResponse.json({ error: "Bu ihale için zaten bir proje var" }, { status: 409 });
    }

    const tender = await prisma.tender.findUnique({
      where: { id: tenderId },
      select: { title: true, deadline: true },
    });

    if (!tender) {
      return NextResponse.json({ error: "İhale bulunamadı" }, { status: 404 });
    }

    // Create project with default preparation tasks
    const project = await prisma.project.create({
      data: {
        tenderId,
        ownerId: user.id,
        title: title || tender.title,
        status: "TAKIPTE",
        tasks: {
          create: [
            { title: "Şartname inceleme", category: "dokuman", sortOrder: 0, dueDate: getDueDate(tender.deadline, -14) },
            { title: "Teknik şartname analizi", category: "teknik", sortOrder: 1, dueDate: getDueDate(tender.deadline, -12) },
            { title: "Maliyet hesaplama", category: "maliyet", sortOrder: 2, dueDate: getDueDate(tender.deadline, -10) },
            { title: "Birim fiyat teklifi hazırlama", category: "teklif", sortOrder: 3, dueDate: getDueDate(tender.deadline, -7) },
            { title: "İç onay süreci", category: "onay", sortOrder: 4, dueDate: getDueDate(tender.deadline, -4) },
            { title: "Teklif zarfı teslimi", category: "gonderim", sortOrder: 5, dueDate: getDueDate(tender.deadline, -1) },
          ],
        },
      },
      include: {
        tender: { select: { id: true, title: true, institution: true, city: true, deadline: true } },
        tasks: true,
      },
    });

    return NextResponse.json({ success: true, data: project }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Proje oluşturulamadı";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function getDueDate(deadline: Date, daysBefore: number): Date {
  const d = new Date(deadline);
  d.setDate(d.getDate() + daysBefore);
  // Don't go before today
  const now = new Date();
  return d < now ? now : d;
}
