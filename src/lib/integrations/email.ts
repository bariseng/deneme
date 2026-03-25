/**
 * Email Service (SMTP / SendGrid)
 *
 * In production, this would use SendGrid or direct SMTP.
 *
 * Required env vars:
 *   SENDGRID_API_KEY or SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 *   EMAIL_FROM
 */

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";
const EMAIL_FROM = process.env.EMAIL_FROM || "bildirim@ihalepro.com";

class EmailService {
  private apiKey: string;
  private from: string;

  constructor() {
    this.apiKey = SENDGRID_API_KEY;
    this.from = EMAIL_FROM;
  }

  async send(options: EmailOptions): Promise<EmailResult> {
    console.log(`[Email] Sending to: ${Array.isArray(options.to) ? options.to.join(", ") : options.to}`);
    console.log(`[Email] Subject: ${options.subject}`);

    if (!this.apiKey) {
      console.log("[Email] SENDGRID_API_KEY not configured, simulating send...");
      return {
        success: true,
        messageId: `demo-${Date.now()}`,
      };
    }

    // In production: actual SendGrid API call
    // const response = await fetch("https://api.sendgrid.com/v3/mail/send", { ... });

    return {
      success: true,
      messageId: `sg-${Date.now()}`,
    };
  }

  async sendTenderNotification(
    to: string,
    tenderTitle: string,
    tenderId: string,
    type: "new" | "deadline" | "amendment" | "result"
  ): Promise<EmailResult> {
    const subjects = {
      new: `Yeni İhale: ${tenderTitle}`,
      deadline: `Son Başvuru Yaklaşıyor: ${tenderTitle}`,
      amendment: `Zeyilname Yayınlandı: ${tenderTitle}`,
      result: `İhale Sonuçlandı: ${tenderTitle}`,
    };

    const html = `
<!DOCTYPE html>
<html lang="tr">
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #1a56db; padding: 20px; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 20px;">İhalePro</h1>
    <p style="color: #93c5fd; margin: 5px 0 0; font-size: 12px;">İhale Takip Platformu</p>
  </div>
  <div style="background: white; padding: 24px; border: 1px solid #e2e8f0; border-top: none;">
    <h2 style="color: #1e293b; font-size: 18px; margin-top: 0;">${subjects[type]}</h2>
    <p style="color: #64748b; font-size: 14px; line-height: 1.6;">
      ${type === "new" ? "Takip ettiğiniz kategoride yeni bir ihale yayınlandı." : ""}
      ${type === "deadline" ? "İlgilendiğiniz ihalenin son başvuru tarihi yaklaşıyor." : ""}
      ${type === "amendment" ? "Bu ihalede zeyilname (değişiklik) yayınlanmıştır." : ""}
      ${type === "result" ? "Bu ihale sonuçlanmıştır." : ""}
    </p>
    <a href="https://ihalepro.com/ihaleler/${tenderId}"
       style="display: inline-block; background: #1a56db; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; margin-top: 12px;">
      İhaleyi Görüntüle
    </a>
  </div>
  <div style="padding: 16px; text-align: center; color: #94a3b8; font-size: 11px;">
    <p>Bu e-posta İhalePro bildirim sistemi tarafından gönderilmiştir.</p>
    <p>Bildirim tercihlerinizi <a href="https://ihalepro.com/dashboard" style="color: #1a56db;">kontrol panelinizden</a> yönetebilirsiniz.</p>
  </div>
</body>
</html>`;

    return this.send({
      to,
      subject: subjects[type],
      html,
      text: `${subjects[type]} - Detay: https://ihalepro.com/ihaleler/${tenderId}`,
    });
  }

  async sendBulkNotification(
    recipients: string[],
    subject: string,
    html: string
  ): Promise<EmailResult[]> {
    const results = await Promise.all(
      recipients.map((to) => this.send({ to, subject, html }))
    );
    return results;
  }
}

export const emailService = new EmailService();
