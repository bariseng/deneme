// ─── WhatsApp Business API Provider ─────────────────────────
// Meta Cloud API for WhatsApp Business messaging
// Template messages require pre-approval from Meta

// ─── Types ──────────────────────────────────────────────────

export interface WhatsAppResult {
  success: boolean;
  messageId?: string;
  errorMessage?: string;
}

interface WhatsAppApiResponse {
  messaging_product: string;
  contacts?: { wa_id: string }[];
  messages?: { id: string }[];
  error?: { message: string; code: number };
}

// Pre-approved template names (must be registered in Meta Business Manager)
export type TemplateName =
  | "tender_notification"
  | "deadline_reminder"
  | "payment_confirmation"
  | "legal_update"
  | "welcome_message";

interface TemplateComponent {
  type: "body" | "header";
  parameters: { type: "text"; text: string }[];
}

// ─── Config ─────────────────────────────────────────────────

function getConfig() {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const apiVersion = process.env.WHATSAPP_API_VERSION || "v21.0";

  if (!token || !phoneNumberId) {
    throw new Error("WHATSAPP_ACCESS_TOKEN ve WHATSAPP_PHONE_NUMBER_ID tanımlanmalı");
  }

  return {
    token,
    phoneNumberId,
    baseUrl: `https://graph.facebook.com/${apiVersion}/${phoneNumberId}`,
  };
}

// ─── Format phone for WhatsApp ──────────────────────────────

function formatWaPhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0")) cleaned = "90" + cleaned.slice(1);
  if (!cleaned.startsWith("90") && cleaned.length === 10) cleaned = "90" + cleaned;
  return cleaned;
}

// ─── Send Template Message ──────────────────────────────────

export async function sendTemplateMessage(
  to: string,
  templateName: TemplateName,
  components: TemplateComponent[],
  language: string = "tr",
): Promise<WhatsAppResult> {
  const config = getConfig();
  const phone = formatWaPhone(to);

  try {
    const res = await fetch(`${config.baseUrl}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "template",
        template: {
          name: templateName,
          language: { code: language },
          components,
        },
      }),
      signal: AbortSignal.timeout(10000),
    });

    const data: WhatsAppApiResponse = await res.json();

    if (data.error) {
      return { success: false, errorMessage: data.error.message };
    }

    return {
      success: true,
      messageId: data.messages?.[0]?.id,
    };
  } catch (error) {
    return {
      success: false,
      errorMessage: error instanceof Error ? error.message : "WhatsApp gönderim hatası",
    };
  }
}

// ─── Tender Notification ────────────────────────────────────

export async function sendTenderNotification(
  to: string,
  tenderTitle: string,
  city: string,
  deadline: string,
): Promise<WhatsAppResult> {
  return sendTemplateMessage(to, "tender_notification", [
    {
      type: "body",
      parameters: [
        { type: "text", text: tenderTitle.substring(0, 100) },
        { type: "text", text: city },
        { type: "text", text: deadline },
      ],
    },
  ]);
}

// ─── Deadline Reminder ──────────────────────────────────────

export async function sendDeadlineWhatsApp(
  to: string,
  tenderTitle: string,
  daysLeft: number,
): Promise<WhatsAppResult> {
  return sendTemplateMessage(to, "deadline_reminder", [
    {
      type: "body",
      parameters: [
        { type: "text", text: tenderTitle.substring(0, 100) },
        { type: "text", text: String(daysLeft) },
      ],
    },
  ]);
}

// ─── Payment Confirmation ───────────────────────────────────

export async function sendPaymentWhatsApp(
  to: string,
  planName: string,
  amount: string,
): Promise<WhatsAppResult> {
  return sendTemplateMessage(to, "payment_confirmation", [
    {
      type: "body",
      parameters: [
        { type: "text", text: planName },
        { type: "text", text: amount },
      ],
    },
  ]);
}

// ─── Legal Update ───────────────────────────────────────────

export async function sendLegalWhatsApp(
  to: string,
  title: string,
  summary: string,
): Promise<WhatsAppResult> {
  return sendTemplateMessage(to, "legal_update", [
    {
      type: "body",
      parameters: [
        { type: "text", text: title.substring(0, 80) },
        { type: "text", text: summary.substring(0, 200) },
      ],
    },
  ]);
}

// ─── Health Check ───────────────────────────────────────────

export async function whatsappHealthCheck(): Promise<{ ok: boolean; latencyMs: number }> {
  const start = Date.now();
  try {
    const config = getConfig();
    const res = await fetch(`${config.baseUrl}`, {
      headers: { Authorization: `Bearer ${config.token}` },
      signal: AbortSignal.timeout(5000),
    });
    return { ok: res.ok, latencyMs: Date.now() - start };
  } catch {
    return { ok: false, latencyMs: Date.now() - start };
  }
}
