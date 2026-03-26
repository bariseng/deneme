// ─── E-posta Provider (Resend) ──────────────────────────────
// Transactional & notification emails with HTML templates

import { Resend } from "resend";

// ─── Types ──────────────────────────────────────────────────

export interface EmailResult {
  success: boolean;
  messageId?: string;
  errorMessage?: string;
}

export interface EmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
}

// ─── Client ─────────────────────────────────────────────────

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY tanımlanmalı");
  return new Resend(apiKey);
}

const FROM_EMAIL = process.env.EMAIL_FROM || "İhalePro <bildirim@ihalepro.com>";
const UNSUBSCRIBE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// ─── Send Email ─────────────────────────────────────────────

export async function sendEmail(params: EmailParams): Promise<EmailResult> {
  try {
    const resend = getResendClient();

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      replyTo: params.replyTo || "destek@ihalepro.com",
      tags: params.tags,
      headers: {
        "List-Unsubscribe": `<${UNSUBSCRIBE_URL}/api/notifications/unsubscribe>`,
      },
    });

    if (error) {
      return { success: false, errorMessage: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    return {
      success: false,
      errorMessage: error instanceof Error ? error.message : "E-posta gönderilemedi",
    };
  }
}

// ─── Template: Welcome ──────────────────────────────────────

export async function sendWelcomeEmail(to: string, name: string): Promise<EmailResult> {
  return sendEmail({
    to,
    subject: "İhalePro'ya Hoş Geldiniz! 🏗️",
    html: wrapTemplate(`
      <h2>Merhaba ${escapeHtml(name)},</h2>
      <p>İhalePro'ya kayıt olduğunuz için teşekkür ederiz.</p>
      <p>Platformumuzda şunları yapabilirsiniz:</p>
      <ul>
        <li>Kamu ihalelerini anlık takip edin</li>
        <li>AI destekli teklif hazırlayın</li>
        <li>Rakip analizi yapın</li>
        <li>Mevzuat değişikliklerinden haberdar olun</li>
      </ul>
      <a href="${UNSUBSCRIBE_URL}/ihaleler" style="${btnStyle}">İhaleleri Keşfet</a>
    `),
    tags: [{ name: "category", value: "welcome" }],
  });
}

// ─── Template: Password Reset ───────────────────────────────

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<EmailResult> {
  return sendEmail({
    to,
    subject: "Şifre Sıfırlama — İhalePro",
    html: wrapTemplate(`
      <h2>Şifre Sıfırlama</h2>
      <p>Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın:</p>
      <a href="${escapeHtml(resetUrl)}" style="${btnStyle}">Şifremi Sıfırla</a>
      <p style="color:#888;font-size:13px;">Bu bağlantı 1 saat geçerlidir. Bu isteği siz yapmadıysanız bu e-postayı görmezden gelin.</p>
    `),
    tags: [{ name: "category", value: "auth" }],
  });
}

// ─── Template: Payment Confirmation ─────────────────────────

export async function sendPaymentConfirmation(
  to: string,
  planName: string,
  amount: number,
  period: string,
): Promise<EmailResult> {
  return sendEmail({
    to,
    subject: `Ödeme Onayı — ${planName} Plan`,
    html: wrapTemplate(`
      <h2>Ödemeniz Alındı ✅</h2>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="${cellStyle}">Plan</td><td style="${cellStyle}"><strong>${escapeHtml(planName)}</strong></td></tr>
        <tr><td style="${cellStyle}">Tutar</td><td style="${cellStyle}">₺${amount.toLocaleString("tr-TR")}</td></tr>
        <tr><td style="${cellStyle}">Dönem</td><td style="${cellStyle}">${period === "yearly" ? "Yıllık" : "Aylık"}</td></tr>
      </table>
      <p>Faturanız en kısa sürede e-posta adresinize gönderilecektir.</p>
      <a href="${UNSUBSCRIBE_URL}/ayarlar/abonelik" style="${btnStyle}">Aboneliğimi Görüntüle</a>
    `),
    tags: [{ name: "category", value: "payment" }],
  });
}

// ─── Template: New Tender Match ─────────────────────────────

export async function sendTenderMatchEmail(
  to: string,
  tenders: { title: string; city: string; deadline: string; budget: string; id: string }[],
): Promise<EmailResult> {
  const tenderRows = tenders
    .slice(0, 10)
    .map(
      (t) => `
      <tr>
        <td style="${cellStyle}"><a href="${UNSUBSCRIBE_URL}/ihaleler/${t.id}">${escapeHtml(t.title.substring(0, 60))}</a></td>
        <td style="${cellStyle}">${escapeHtml(t.city)}</td>
        <td style="${cellStyle}">${escapeHtml(t.deadline)}</td>
        <td style="${cellStyle}">${escapeHtml(t.budget)}</td>
      </tr>`,
    )
    .join("");

  return sendEmail({
    to,
    subject: `${tenders.length} Yeni İhale Eşleşmesi — İhalePro`,
    html: wrapTemplate(`
      <h2>Kriterlere Uyan ${tenders.length} Yeni İhale</h2>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="${cellStyle}">İhale</th>
            <th style="${cellStyle}">İl</th>
            <th style="${cellStyle}">Son Tarih</th>
            <th style="${cellStyle}">Bütçe</th>
          </tr>
        </thead>
        <tbody>${tenderRows}</tbody>
      </table>
      <a href="${UNSUBSCRIBE_URL}/ihaleler" style="${btnStyle}">Tüm İhaleleri Gör</a>
    `),
    tags: [{ name: "category", value: "tender_match" }],
  });
}

// ─── Template: Deadline Reminder ────────────────────────────

export async function sendDeadlineReminderEmail(
  to: string,
  tenderTitle: string,
  daysLeft: number,
  tenderId: string,
): Promise<EmailResult> {
  const urgency = daysLeft <= 1 ? "🔴" : daysLeft <= 3 ? "🟡" : "🔵";

  return sendEmail({
    to,
    subject: `${urgency} Son ${daysLeft} Gün — ${tenderTitle.substring(0, 50)}`,
    html: wrapTemplate(`
      <h2>${urgency} İhale Son Başvuru Yaklaşıyor</h2>
      <p><strong>${escapeHtml(tenderTitle)}</strong></p>
      <p style="font-size:24px;color:#dc2626;font-weight:bold;">Son ${daysLeft} gün kaldı!</p>
      <a href="${UNSUBSCRIBE_URL}/ihaleler/${tenderId}" style="${btnStyle}">İhaleyi İncele</a>
    `),
    tags: [{ name: "category", value: "deadline" }],
  });
}

// ─── Template: Legal Update ─────────────────────────────────

export async function sendLegalUpdateEmail(
  to: string,
  title: string,
  summary: string,
  updateId: string,
): Promise<EmailResult> {
  return sendEmail({
    to,
    subject: `Mevzuat Değişikliği — ${title.substring(0, 50)}`,
    html: wrapTemplate(`
      <h2>📜 Mevzuat Güncelleme</h2>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(summary)}</p>
      <a href="${UNSUBSCRIBE_URL}/mevzuat/${updateId}" style="${btnStyle}">Detayları Gör</a>
    `),
    tags: [{ name: "category", value: "legal" }],
  });
}

// ─── HTML Template Wrapper ──────────────────────────────────

function wrapTemplate(body: string): string {
  return `<!DOCTYPE html>
<html lang="tr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;">
<div style="max-width:600px;margin:0 auto;padding:24px;">
  <div style="background:#1e40af;padding:20px 24px;border-radius:8px 8px 0 0;">
    <h1 style="color:#fff;margin:0;font-size:20px;">İhalePro</h1>
  </div>
  <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
    ${body}
  </div>
  <div style="text-align:center;padding:16px;color:#9ca3af;font-size:12px;">
    <p>Bu e-posta İhalePro bildirim sistemi tarafından gönderilmiştir.</p>
    <a href="${UNSUBSCRIBE_URL}/api/notifications/unsubscribe" style="color:#9ca3af;">Abonelikten Çık</a>
  </div>
</div>
</body></html>`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const btnStyle =
  "display:inline-block;background:#1e40af;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin:16px 0;";
const cellStyle = "padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:left;font-size:14px;";
