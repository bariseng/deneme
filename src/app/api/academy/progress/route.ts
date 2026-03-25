import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getUserProgress, getAcademyStats } from "@/lib/academy";

export async function GET() {
  try {
    const user = await requireAuth();
    const [progress, stats] = await Promise.all([
      getUserProgress(user.id),
      getAcademyStats(user.id),
    ]);
    return NextResponse.json({ progress, stats });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "Oturum açın" }, { status: 401 });
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
