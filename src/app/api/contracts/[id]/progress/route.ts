import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { addWorkProgress } from "@/lib/contract-manager";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    if (!body.title || body.completionRate == null) {
      return NextResponse.json({ error: "Gerekli alanlar eksik" }, { status: 400 });
    }

    const progress = await addWorkProgress(id, user.id, {
      title: body.title,
      description: body.description,
      completionRate: parseFloat(body.completionRate),
      isMilestone: body.isMilestone ?? false,
      milestoneDate: body.milestoneDate ? new Date(body.milestoneDate) : undefined,
      photos: body.photos,
      notes: body.notes,
    });

    return NextResponse.json({ success: true, data: progress }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "İlerleme kaydedilemedi";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
