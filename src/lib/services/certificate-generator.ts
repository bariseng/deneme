// ─── Sertifika Oluşturucu ─────────────────────────────────
// PDF + QR kod ile sertifika üretme ve doğrulama

import QRCode from "qrcode";

// ─── Types ──────────────────────────────────────────────────

export interface CertificateData {
  certificateNumber: string;
  userName: string;
  courseTitle: string;
  courseCategory: string;
  issuedAt: Date;
  verificationUrl: string;
}

export interface CertificatePdf {
  content: string; // SVG-based HTML for PDF rendering
  qrCodeDataUrl: string;
}

// ─── QR Code Generation ─────────────────────────────────────

export async function generateQRCode(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 200,
    color: { dark: "#1e3a5f", light: "#ffffff" },
  });
}

// ─── Certificate HTML/SVG ───────────────────────────────────
// Generates a printable certificate as HTML (can be rendered to PDF client-side)

export async function generateCertificateHtml(data: CertificateData): Promise<CertificatePdf> {
  const qrCodeDataUrl = await generateQRCode(data.verificationUrl);
  const formattedDate = data.issuedAt.toLocaleDateString("tr-TR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const categoryLabels: Record<string, string> = {
    MEVZUAT: "Mevzuat",
    EKAP: "EKAP Sistemi",
    TEKLIF: "Teklif Hazırlama",
    SOZLESME: "Sözleşme Yönetimi",
    FINANS: "İhale Finansmanı",
  };

  const content = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<style>
  @page { size: A4 landscape; margin: 0; }
  body { margin: 0; padding: 0; font-family: 'Georgia', serif; }
  .certificate {
    width: 297mm; height: 210mm;
    position: relative; overflow: hidden;
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    border: 8px solid #1e3a5f;
    box-sizing: border-box;
  }
  .inner-border {
    position: absolute; top: 12px; left: 12px; right: 12px; bottom: 12px;
    border: 2px solid #c9a84c;
  }
  .content { padding: 40px 60px; text-align: center; position: relative; z-index: 1; }
  .logo { font-size: 28px; font-weight: bold; color: #1e3a5f; letter-spacing: 4px; margin-bottom: 10px; }
  .subtitle { font-size: 14px; color: #6c757d; margin-bottom: 30px; }
  .title { font-size: 36px; color: #c9a84c; font-weight: bold; margin-bottom: 20px; letter-spacing: 6px; }
  .recipient { font-size: 32px; color: #1e3a5f; font-weight: bold; margin: 20px 0;
    border-bottom: 2px solid #c9a84c; display: inline-block; padding-bottom: 5px; }
  .course { font-size: 18px; color: #495057; margin: 15px 0; }
  .category { display: inline-block; background: #1e3a5f; color: white;
    padding: 4px 16px; border-radius: 4px; font-size: 13px; margin: 8px 0; }
  .details { font-size: 13px; color: #6c757d; margin-top: 20px; }
  .cert-number { font-family: monospace; font-size: 12px; color: #868e96; margin-top: 10px; }
  .qr-section { position: absolute; bottom: 30px; right: 40px; text-align: center; }
  .qr-section img { width: 80px; height: 80px; }
  .qr-label { font-size: 9px; color: #868e96; margin-top: 4px; }
  .footer { position: absolute; bottom: 30px; left: 60px; font-size: 11px; color: #868e96; }
</style>
</head>
<body>
<div class="certificate">
  <div class="inner-border"></div>
  <div class="content">
    <div class="logo">İHALEPRO</div>
    <div class="subtitle">Kamu İhale Eğitim Platformu</div>
    <div class="title">SERTİFİKA</div>
    <p style="font-size:16px; color:#495057;">Bu belge, aşağıda adı geçen kişinin eğitim programını başarıyla tamamladığını belirtir.</p>
    <div class="recipient">${escapeHtml(data.userName)}</div>
    <div class="course">${escapeHtml(data.courseTitle)}</div>
    <div class="category">${categoryLabels[data.courseCategory] || data.courseCategory}</div>
    <div class="details">Veriliş Tarihi: ${formattedDate}</div>
    <div class="cert-number">Sertifika No: ${data.certificateNumber}</div>
  </div>
  <div class="qr-section">
    <img src="${qrCodeDataUrl}" alt="Doğrulama QR Kodu" />
    <div class="qr-label">Doğrulamak için tarayın</div>
  </div>
  <div class="footer">
    İhalePro Akademi — ${data.verificationUrl}
  </div>
</div>
</body>
</html>`;

  return { content, qrCodeDataUrl };
}

// ─── Verification ───────────────────────────────────────────

export function buildVerificationUrl(certificateNumber: string): string {
  const baseUrl = process.env.NEXTAUTH_URL || "https://ihalepro.com";
  return `${baseUrl}/sertifika/${certificateNumber}`;
}

// ─── Helpers ────────────────────────────────────────────────

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
