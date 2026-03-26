import { NextRequest, NextResponse } from "next/server";
import { checkSystem, checkAllSystems, type SystemName } from "@/lib/services/integration-health";

const VALID_SYSTEMS: SystemName[] = ["ekap", "kep", "esign", "edevlet", "database"];

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ system: string }> },
) {
  try {
    const { system } = await params;

    if (system === "all") {
      const results = await checkAllSystems();
      const allHealthy = results.every((r) => r.ok);
      return NextResponse.json(
        { success: true, data: { allHealthy, systems: results } },
        { status: allHealthy ? 200 : 503 },
      );
    }

    if (!VALID_SYSTEMS.includes(system as SystemName)) {
      return NextResponse.json(
        { error: `Geçersiz sistem. Geçerli: ${VALID_SYSTEMS.join(", ")}, all` },
        { status: 400 },
      );
    }

    const result = await checkSystem(system as SystemName);
    return NextResponse.json(
      { success: true, data: result },
      { status: result.ok ? 200 : 503 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Health check hatası" },
      { status: 500 },
    );
  }
}
