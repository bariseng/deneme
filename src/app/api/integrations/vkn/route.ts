import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { vknProvider } from "@/lib/providers/vkn-provider";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const sp = request.nextUrl.searchParams;
    const vkn = sp.get("vkn");

    if (!vkn)
      return NextResponse.json(
        { error: "vkn parametresi gerekli" },
        { status: 400 },
      );

    const trimmed = vkn.trim();
    if (!/^\d{10}$/.test(trimmed))
      return NextResponse.json(
        { error: "VKN 10 haneli rakam olmalı" },
        { status: 400 },
      );

    const mode = sp.get("mode") ?? "online";

    if (mode === "checksum") {
      const valid = vknProvider.validateChecksum(trimmed);
      return NextResponse.json({ vkn: trimmed, valid, mode: "checksum" });
    }

    // Default: online verification via GİB
    const result = await vknProvider.verifyOnline(trimmed);
    return NextResponse.json({ vkn: trimmed, ...result, mode: "online" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Hata";
    if (msg === "UNAUTHORIZED")
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
