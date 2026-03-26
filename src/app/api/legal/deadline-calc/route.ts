import { NextRequest, NextResponse } from "next/server";
import {
  calculateDeadline,
  getCommonScenarios,
  getHolidaysInRange,
  type ProcedureType,
  type TenderType,
} from "@/lib/services/deadline-calculator";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    // Return common scenarios for a given date
    if (action === "scenarios") {
      const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
      const scenarios = await getCommonScenarios(date);
      return NextResponse.json({ success: true, data: scenarios });
    }

    // Return holidays in a date range
    if (action === "holidays") {
      const start = searchParams.get("start");
      const end = searchParams.get("end");
      if (!start || !end) {
        return NextResponse.json(
          { error: "start ve end parametreleri gerekli (YYYY-MM-DD)" },
          { status: 400 },
        );
      }
      const holidays = await getHolidaysInRange(start, end);
      return NextResponse.json({ success: true, data: holidays });
    }

    // Calculate specific deadline
    const announcementDate = searchParams.get("date");
    const procedureType = searchParams.get("procedure") as ProcedureType | null;
    const tenderType = searchParams.get("type") as TenderType | null;
    const aboveThreshold = searchParams.get("threshold") === "true";
    const hasAddendum = searchParams.get("addendum") === "true";
    const addendumDate = searchParams.get("addendumDate") || undefined;

    if (!announcementDate || !procedureType || !tenderType) {
      return NextResponse.json(
        {
          error: "Gerekli parametreler: date (YYYY-MM-DD), procedure, type",
          procedures: ["ACIK_IHALE", "BELLI_ISTEKLILER", "PAZARLIK", "DOGRUDAN_TEMIN"],
          types: ["YAPIM", "MAL_ALIMI", "HIZMET", "DANISMANLIK"],
        },
        { status: 400 },
      );
    }

    const result = await calculateDeadline({
      announcementDate,
      procedureType,
      tenderType,
      aboveThreshold,
      hasAddendum,
      addendumDate,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Sunucu hatası";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
