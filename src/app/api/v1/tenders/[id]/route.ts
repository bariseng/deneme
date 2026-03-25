import { NextRequest, NextResponse } from "next/server";
import { tenders } from "@/lib/data";

/**
 * GET /api/v1/tenders/:id
 *
 * Get a single tender by ID with full details.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tender = tenders.find((t) => t.id === id);

    if (!tender) {
      return NextResponse.json(
        { success: false, error: "İhale bulunamadı" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: tender,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}
