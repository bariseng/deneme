import { NextRequest, NextResponse } from "next/server";
import { verifyCertificate } from "@/lib/academy";
import { generateCertificateHtml, buildVerificationUrl } from "@/lib/services/certificate-generator";

/**
 * GET /api/academy/certificates/:number/pdf
 * Generate certificate as HTML (renderable to PDF)
 * Query: ?format=html (default) | ?format=qr (QR code only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ number: string }> },
) {
  try {
    const { number } = await params;
    const format = request.nextUrl.searchParams.get("format") || "html";
    const cert = await verifyCertificate(number);

    if (!cert) {
      return NextResponse.json({ error: "Sertifika bulunamadı" }, { status: 404 });
    }

    const verificationUrl = buildVerificationUrl(cert.certificateNumber);
    const result = await generateCertificateHtml({
      certificateNumber: cert.certificateNumber,
      userName: cert.user.name || "İsimsiz",
      courseTitle: cert.course.title,
      courseCategory: cert.course.category,
      issuedAt: cert.issuedAt,
      verificationUrl,
    });

    if (format === "qr") {
      return NextResponse.json({ qrCodeDataUrl: result.qrCodeDataUrl, verificationUrl });
    }

    // Return HTML for PDF rendering
    return new NextResponse(result.content, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename=ihalepro-sertifika-${number}.html`,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Sertifika oluşturma hatası";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
