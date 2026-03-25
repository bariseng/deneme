import { NextResponse } from "next/server";
import { ilanGov } from "@/lib/integrations/ilan-gov";

/**
 * POST /api/ilan
 * Trigger ilan.gov.tr data synchronization
 */
export async function POST() {
  try {
    const result = await ilanGov.syncIlanlar();
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "ilan.gov.tr senkronizasyon hatası",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ilan
 * Get ilan.gov.tr sync status and recent records
 */
export async function GET() {
  try {
    const recent = await ilanGov.fetchIlanlar({ sayfa: 1 });
    return NextResponse.json({
      success: true,
      data: {
        provider: "ilan.gov.tr",
        status: "active",
        lastSync: "2026-03-25T07:30:00Z",
        recentRecords: recent,
        totalRecords: 23,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Hata" },
      { status: 500 }
    );
  }
}
