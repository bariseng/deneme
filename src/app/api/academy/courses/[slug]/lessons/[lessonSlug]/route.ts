import { NextRequest, NextResponse } from "next/server";
import { getLessonBySlug } from "@/lib/academy";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; lessonSlug: string }> }
) {
  try {
    const { slug, lessonSlug } = await params;
    const lesson = await getLessonBySlug(slug, lessonSlug);
    if (!lesson) return NextResponse.json({ error: "Ders bulunamadı" }, { status: 404 });
    return NextResponse.json(lesson);
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
