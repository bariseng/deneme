import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { kapProvider } from "@/lib/providers/kap-provider";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const sp = request.nextUrl.searchParams;
    const action = sp.get("action");

    if (action === "sync") {
      const result = await kapProvider.syncFromKap();
      return NextResponse.json({
        success: true,
        synced: result.synced,
        errors: result.errors,
        duration: result.duration,
      });
    }

    if (action === "financials") {
      const code = sp.get("code");
      if (!code)
        return NextResponse.json(
          { error: "code parametresi gerekli" },
          { status: 400 },
        );

      const data = await kapProvider.getCompanyFinancials(code);
      if (!data)
        return NextResponse.json(
          { error: "Şirket bulunamadı" },
          { status: 404 },
        );

      return NextResponse.json(data);
    }

    if (action === "search") {
      const q = sp.get("q");
      if (!q)
        return NextResponse.json(
          { error: "q parametresi gerekli" },
          { status: 400 },
        );

      const results = await kapProvider.searchCompanies(q);
      return NextResponse.json({ results, count: results.length });
    }

    return NextResponse.json({
      actions: ["sync", "search?q=ENKA", "financials?code=ENKAI"],
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Hata";
    if (msg === "UNAUTHORIZED")
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
