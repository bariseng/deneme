import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { submitQuiz } from "@/lib/academy";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const user = await requireAuth();
    const { lessonId } = await params;
    const { answers } = await req.json();

    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json({ error: "Cevaplar gerekli" }, { status: 400 });
    }

    const result = await submitQuiz(user.id, lessonId, answers);
    return NextResponse.json(result);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Oturum açın" }, { status: 401 });
    if (e instanceof Error && e.message === "Quiz bulunamadı")
      return NextResponse.json({ error: e.message }, { status: 404 });
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
