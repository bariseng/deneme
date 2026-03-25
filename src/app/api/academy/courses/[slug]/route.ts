import { NextRequest, NextResponse } from "next/server";
import { getCourseBySlug } from "@/lib/academy";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const course = await getCourseBySlug(slug);
    if (!course) return NextResponse.json({ error: "Kurs bulunamadı" }, { status: 404 });
    return NextResponse.json(course);
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
