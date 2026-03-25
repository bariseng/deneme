import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { useAICredit } from "@/lib/quota";
import { simulateOCR, saveOCRResult } from "@/lib/document-manager";

/**
 * POST /api/documents/:id/ocr — Run OCR on a document version
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    // AI credit check — OCR consumes 1 AI credit
    const credit = await useAICredit(user.id, "ocr", "OCR Doküman Tarama");
    if (!credit.success) {
      return NextResponse.json(
        { error: credit.message, upgradeRequired: true },
        { status: 403 }
      );
    }

    // Simulate OCR processing
    const sampleText = body.text || `Bu ihale şartnamesi kapsamında yaklaşık maliyet hesaplanmıştır.
Geçici teminat oranı %6 olarak belirlenmiş olup, birim fiyat teklif cetveli usulüyle
ihale gerçekleştirilecektir. İş deneyim belgesi tutarı teklif edilen bedelin %80'inden
az olamaz. Sözleşme kapsamında KDV hariç fatura düzenlenecektir.`;

    const ocrResult = await simulateOCR(sampleText);

    // Save OCR result if versionId provided
    if (body.versionId) {
      await saveOCRResult(body.versionId, ocrResult.extractedText);
    }

    return NextResponse.json({ success: true, data: ocrResult });
  } catch (error) {
    const message = error instanceof Error ? error.message : "OCR işlemi başarısız";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
