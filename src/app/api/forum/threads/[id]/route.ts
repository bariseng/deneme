import { NextRequest, NextResponse } from "next/server";
import { getThreadDetail } from "@/lib/community";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const thread = await getThreadDetail(id);
    if (!thread) {
      return NextResponse.json({ error: "Konu bulunamadı" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: thread });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Konu alınamadı";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
