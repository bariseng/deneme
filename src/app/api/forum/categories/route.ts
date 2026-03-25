import { NextResponse } from "next/server";
import { getOrCreateCategories } from "@/lib/community";

export async function GET() {
  try {
    const categories = await getOrCreateCategories();
    return NextResponse.json({ success: true, data: categories });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kategoriler alınamadı";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
