// ─── SMS Provider (Netgsm) ──────────────────────────────────
// OTP, ihale deadline hatırlatma, IYS uyumlu ticari ileti

import { prisma } from "@/lib/prisma";

// ─── Types ──────────────────────────────────────────────────

export interface SmsResult {
  success: boolean;
  messageId?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface SmsSendParams {
  to: string;       // +905XXXXXXXXX
  message: string;
  isOtp?: boolean;   // OTP bypass IYS
  userId?: string;
}

interface NetgsmResponse {
  code: string;
  jobId?: string;
  error?: string;
}

// ─── Netgsm Config ──────────────────────────────────────────

function getConfig() {
  const usercode = process.env.NETGSM_USERCODE;
  const password = process.env.NETGSM_PASSWORD;
  const header = process.env.NETGSM_HEADER || "IHALEPRO";
  const baseUrl = "https://api.netgsm.com.tr";

  if (!usercode || !password) {
    throw new Error("NETGSM_USERCODE ve NETGSM_PASSWORD tanımlanmalı");
  }

  return { usercode, password, header, baseUrl };
}

// ─── Format phone number ───────────────────────────────────

function formatPhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("90") && cleaned.length === 12) return cleaned;
  if (cleaned.startsWith("0") && cleaned.length === 11) return "90" + cleaned.slice(1);
  if (cleaned.length === 10) return "90" + cleaned;
  return cleaned;
}

// ─── Send SMS via Netgsm XML API ────────────────────────────

export async function sendSms(params: SmsSendParams): Promise<SmsResult> {
  const config = getConfig();
  const phone = formatPhone(params.to);

  // Daily limit check (non-OTP)
  if (!params.isOtp && params.userId) {
    const allowed = await checkDailyLimit(params.userId, "sms");
    if (!allowed) {
      return { success: false, errorCode: "RATE_LIMIT", errorMessage: "Günlük SMS limiti aşıldı" };
    }
  }

  try {
    const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<mainbody>
  <header>
    <company>Netgsm</company>
    <usercode>${config.usercode}</usercode>
    <password>${config.password}</password>
    <type>1:n</type>
    <msgheader>${config.header}</msgheader>
  </header>
  <body>
    <msg><![CDATA[${params.message}]]></msg>
    <no>${phone}</no>
  </body>
</mainbody>`;

    const res = await fetch(`${config.baseUrl}/sms/send/xml`, {
      method: "POST",
      headers: { "Content-Type": "application/xml" },
      body: xmlBody,
      signal: AbortSignal.timeout(10000),
    });

    const text = await res.text();
    const parsed = parseNetgsmResponse(text);

    // Log SMS
    if (params.userId) {
      await logSmsSend(params.userId, phone, params.message, parsed);
    }

    if (parsed.code === "00" || parsed.code === "01" || parsed.code === "02") {
      return { success: true, messageId: parsed.jobId };
    }

    return {
      success: false,
      errorCode: parsed.code,
      errorMessage: NETGSM_ERRORS[parsed.code] || parsed.error || "Bilinmeyen hata",
    };
  } catch (error) {
    return {
      success: false,
      errorCode: "NETWORK",
      errorMessage: error instanceof Error ? error.message : "Bağlantı hatası",
    };
  }
}

// ─── Send OTP SMS ───────────────────────────────────────────

export async function sendOtp(phone: string, code: string): Promise<SmsResult> {
  return sendSms({
    to: phone,
    message: `İhalePro doğrulama kodunuz: ${code}\nBu kodu kimseyle paylaşmayın. 5 dakika geçerlidir.`,
    isOtp: true,
  });
}

// ─── Send Deadline Reminder SMS ─────────────────────────────

export async function sendDeadlineReminder(
  userId: string,
  phone: string,
  tenderTitle: string,
  daysLeft: number,
): Promise<SmsResult> {
  const message = daysLeft === 0
    ? `⚠️ İhalePro: "${tenderTitle}" ihalesi BUGÜN sona eriyor!`
    : `İhalePro: "${tenderTitle}" ihalesi ${daysLeft} gün sonra sona eriyor. Teklifinizi hazırlayın.`;

  return sendSms({ to: phone, message, userId });
}

// ─── IYS Consent Check ─────────────────────────────────────
// Ticari elektronik ileti için İYS kaydı gerekir

export async function checkIysConsent(phone: string): Promise<boolean> {
  // In production: Check IYS (İleti Yönetim Sistemi) API
  // https://iys.org.tr API ile marka bazlı onay sorgusu
  // OTP mesajları IYS'den muaf (transactional)
  const config = getConfig();

  try {
    const res = await fetch(`${config.baseUrl}/sms/iys/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        usercode: config.usercode,
        password: config.password,
        phone: formatPhone(phone),
        brandCode: process.env.NETGSM_IYS_BRAND_CODE || "",
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return false;
    const data = await res.json();
    return data.consent === true;
  } catch {
    // If IYS check fails, default to not sending (safe approach)
    return false;
  }
}

// ─── Rate Limiting ──────────────────────────────────────────

const DAILY_SMS_LIMIT = 10;

async function checkDailyLimit(userId: string, _channel: string): Promise<boolean> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const count = await prisma.notification.count({
    where: {
      userId,
      type: "SISTEM",
      createdAt: { gte: today },
    },
  });

  return count < DAILY_SMS_LIMIT;
}

// ─── Helpers ────────────────────────────────────────────────

function parseNetgsmResponse(text: string): NetgsmResponse {
  // Netgsm returns "code jobId" or just "code"
  const parts = text.trim().split(" ");
  return {
    code: parts[0] || "99",
    jobId: parts[1],
  };
}

async function logSmsSend(
  userId: string,
  phone: string,
  message: string,
  result: NetgsmResponse,
): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId,
        type: "SISTEM",
        title: "SMS Gönderildi",
        message: `Tel: ${phone.slice(-4)} — ${message.substring(0, 100)}`,
        link: result.jobId ? `/bildirimler?smsId=${result.jobId}` : undefined,
      },
    });
  } catch {
    // Non-blocking log
  }
}

const NETGSM_ERRORS: Record<string, string> = {
  "20": "Mesaj metni boş",
  "30": "Geçersiz kullanıcı bilgileri",
  "40": "Mesaj başlığı tanımlı değil",
  "50": "IYS onayı yok — abonenin izni gerekli",
  "51": "IYS sorgusu başarısız",
  "70": "Geçersiz parametre",
  "80": "Gönderim limiti aşıldı",
  "85": "Mükerrer gönderim",
};
