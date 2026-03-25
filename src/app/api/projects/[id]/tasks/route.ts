import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

/**
 * POST /api/projects/:id/tasks — Add task to project
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    // Verify ownership
    const project = await prisma.project.findFirst({
      where: { id, ownerId: user.id },
    });

    if (!project) {
      return NextResponse.json({ error: "Proje bulunamadı" }, { status: 404 });
    }

    if (!body.title) {
      return NextResponse.json({ error: "Görev başlığı zorunludur" }, { status: 400 });
    }

    // Get max sort order
    const lastTask = await prisma.projectTask.findFirst({
      where: { projectId: id },
      orderBy: { sortOrder: "desc" },
    });

    const task = await prisma.projectTask.create({
      data: {
        projectId: id,
        title: body.title,
        description: body.description,
        assigneeId: body.assigneeId,
        category: body.category,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        sortOrder: (lastTask?.sortOrder ?? -1) + 1,
      },
      include: {
        assignee: { select: { id: true, name: true, image: true } },
      },
    });

    return NextResponse.json({ success: true, data: task }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Görev eklenemedi";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
