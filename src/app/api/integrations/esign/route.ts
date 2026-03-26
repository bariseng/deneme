import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { verifySignedDocument } from "@/lib/services/esign-verify";

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const formData = await request.formData();
    const document = formData.get("document") as File | null;
    const signature = formData.get("signature") as File | null;
    const certificate = formData.get("certificate") as File | null;
    const documentVersionId = formData.get("documentVersionId") as string | null;
    const signerId = formData.get("signerId") as string | null;

    if (!document || !signature || !certificate) {
      return NextResponse.json(
        { error: "document, signature ve certificate dosyaları gerekli" },
        { status: 400 },
      );
    }

    const docBuffer = Buffer.from(await document.arrayBuffer());
    const sigBuffer = Buffer.from(await signature.arrayBuffer());
    const certBuffer = Buffer.from(await certificate.arrayBuffer());

    const result = await verifySignedDocument(
      docBuffer,
      sigBuffer,
      certBuffer,
      documentVersionId || undefined,
      signerId || undefined,
    );

    return NextResponse.json({
      success: true,
      data: {
        isValid: result.isValid,
        signerName: result.signerName,
        signerSerialNumber: result.signerSerialNumber,
        issuer: result.issuer,
        signedAt: result.signedAt,
        expiresAt: result.expiresAt,
        algorithm: result.algorithm,
        errors: result.errors,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "e-İmza doğrulama hatası";
    if (message === "UNAUTHORIZED") return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
