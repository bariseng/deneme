import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDocumentList, getDocumentDownloadUrl, trackResults, checkBanStatus, getEkapCalendar } from "@/lib/services/ekap-deep";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = request.nextUrl;
    const action = searchParams.get("action");

    switch (action) {
      case "documents": {
        const tenderId = searchParams.get("tenderId");
        if (!tenderId) return NextResponse.json({ error: "tenderId gerekli" }, { status: 400 });
        const docs = await getDocumentList(tenderId);
        return NextResponse.json({ success: true, data: docs });
      }

      case "download-url": {
        const tenderId = searchParams.get("tenderId");
        const docType = searchParams.get("docType");
        if (!tenderId || !docType) return NextResponse.json({ error: "tenderId ve docType gerekli" }, { status: 400 });
        const url = await getDocumentDownloadUrl(tenderId, docType);
        if (!url) return NextResponse.json({ error: "Belge bulunamadı" }, { status: 404 });
        return NextResponse.json({ success: true, data: { url } });
      }

      case "result": {
        const tenderId = searchParams.get("tenderId");
        if (!tenderId) return NextResponse.json({ error: "tenderId gerekli" }, { status: 400 });
        const result = await trackResults(tenderId);
        if (!result) return NextResponse.json({ error: "Sonuç henüz açıklanmamış" }, { status: 404 });
        return NextResponse.json({ success: true, data: result });
      }

      case "ban-check": {
        const companyName = searchParams.get("companyName");
        if (!companyName) return NextResponse.json({ error: "companyName gerekli" }, { status: 400 });
        const taxNumber = searchParams.get("taxNumber") || undefined;
        const result = await checkBanStatus(companyName, taxNumber);
        return NextResponse.json({ success: true, data: result });
      }

      case "calendar": {
        const daysAhead = parseInt(searchParams.get("days") || "30");
        const items = await getEkapCalendar(user.id, daysAhead);
        return NextResponse.json({ success: true, data: items });
      }

      default:
        return NextResponse.json(
          { error: "Geçersiz action. Geçerli: documents, download-url, result, ban-check, calendar" },
          { status: 400 },
        );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "EKAP hatası";
    if (message === "UNAUTHORIZED") return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
