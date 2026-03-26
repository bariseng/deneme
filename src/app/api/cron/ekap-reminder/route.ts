import { NextRequest, NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/security/input-sanitizer";
import { runEkapReminderBot } from "@/lib/services/ekap-reminder";

export async function POST(request: NextRequest) {
  try {
    if (!verifyCronRequest(request)) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const result = await runEkapReminderBot();
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "EKAP reminder hatası" },
      { status: 500 },
    );
  }
}
