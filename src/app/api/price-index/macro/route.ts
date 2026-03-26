import { NextRequest, NextResponse } from "next/server";
import { tuikProvider } from "@/lib/providers/tuik-provider";
import { getMacroIndices } from "@/lib/services/price-index";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const months = parseInt(searchParams.get("months") || "12");

    if (action === "sync") {
      const count = await tuikProvider.syncMacroIndices();
      return NextResponse.json({ success: true, synced: count });
    }

    const data = await getMacroIndices(months);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Sunucu hatası";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
