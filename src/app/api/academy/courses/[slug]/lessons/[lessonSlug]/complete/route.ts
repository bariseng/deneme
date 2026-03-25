import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { completeLesson, getLessonBySlug } from "@/lib/academy";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; lessonSlug: string }> }
) {
  try {
    const user = await requireAuth();
    const { slug, lessonSlug } = await params;

    const lesson = await getLessonBySlug(slug, lessonSlug);
    if (!lesson) return NextResponse.json({ error: "Ders bulunamadı" }, { status: 404 });

    const result = await completeLesson(user.id, lesson.course.id, lesson.id);
    return NextResponse.json(result);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Oturum açın" }, { status: 401 });
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
