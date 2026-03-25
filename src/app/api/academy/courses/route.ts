import { NextRequest, NextResponse } from "next/server";
import { getCourses, seedAcademyCourses } from "@/lib/academy";
import type { CourseDifficulty } from "@/generated/prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || undefined;
    const difficulty = searchParams.get("difficulty") as CourseDifficulty | null;
    const search = searchParams.get("search") || undefined;
    const seed = searchParams.get("seed");

    if (seed === "true") {
      await seedAcademyCourses();
    }

    const courses = await getCourses({
      ...(category && { category }),
      ...(difficulty && { difficulty }),
      ...(search && { search }),
    });

    return NextResponse.json(courses);
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
