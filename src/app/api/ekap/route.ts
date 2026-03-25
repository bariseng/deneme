import { NextResponse } from "next/server";
import { ekap } from "@/lib/integrations/ekap";

/**
 * POST /api/ekap
 * Trigger EKAP data synchronization
 */
export async function POST() {
  try {
    const result = await ekap.syncTenders();
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "EKAP senkronizasyon hatası",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ekap
 * Get EKAP sync status
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      provider: "EKAP (ekap.kik.gov.tr)",
      status: process.env.EKAP_API_KEY ? "configured" : "demo",
      lastSync: "2026-03-25T08:00:00Z",
      nextSync: "2026-03-25T09:00:00Z",
      syncInterval: "1 saat",
      totalRecords: 30,
    },
  });
}
