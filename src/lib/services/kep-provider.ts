// ─── KEP (Kayıtlı Elektronik Posta) Provider ────────────────
// TURKKEP REST API integration for legal tender correspondence
// KEP messages carry legal evidence value (kesin delil) in Turkish law

import { ProviderCache } from "@/lib/providers/cache";
import { prisma } from "@/lib/prisma";

const cache = new ProviderCache();

// ─── Types ──────────────────────────────────────────────────

export interface KepMessage {
  id: string;
  from: string;
  to: string[];
  subject: string;
  body: string;
  attachments: { name: string; size: number; mimeType: string }[];
  status: "sent" | "delivered" | "read" | "failed";
  sentAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
  receiptId?: string; // Teslim alındı belge no
}

export interface KepSendRequest {
  to: string[];           // KEP addresses
  subject: string;
  body: string;
  attachments?: { name: string; content: string; mimeType: string }[]; // base64
  tenderId?: string;      // Link to tender
  priority?: "normal" | "urgent";
}

export interface KepConfig {
  provider: "TURKKEP" | "PTT_KEP" | "OTHER";
  apiUrl: string;
  apiKey: string;
  senderAddress: string;
}

// ─── Config ─────────────────────────────────────────────────

function getConfig(): KepConfig {
  return {
    provider: (process.env.KEP_PROVIDER as KepConfig["provider"]) || "TURKKEP",
    apiUrl: process.env.KEP_API_URL || "https://api.turkkep.com.tr/v1",
    apiKey: process.env.KEP_API_KEY || "",
    senderAddress: process.env.KEP_SENDER || "",
  };
}

// ─── API Client ─────────────────────────────────────────────

async function kepFetch(path: string, options: RequestInit = {}): Promise<unknown> {
  const config = getConfig();
  if (!config.apiKey) throw new Error("KEP_API_KEY tanımlanmamış");

  const response = await fetch(`${config.apiUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
      "X-KEP-Sender": config.senderAddress,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`KEP API hatası (${response.status}): ${errorText}`);
  }

  return response.json();
}

// ─── Send KEP Message ───────────────────────────────────────

export async function sendKepMessage(request: KepSendRequest): Promise<KepMessage> {
  const payload = {
    recipients: request.to,
    subject: request.subject,
    body: request.body,
    attachments: request.attachments?.map((a) => ({
      fileName: a.name,
      content: a.content,
      contentType: a.mimeType,
    })) || [],
    priority: request.priority || "normal",
  };

  const result = await kepFetch("/messages/send", {
    method: "POST",
    body: JSON.stringify(payload),
  }) as Record<string, unknown>;

  const message: KepMessage = {
    id: result.messageId as string,
    from: getConfig().senderAddress,
    to: request.to,
    subject: request.subject,
    body: request.body,
    attachments: request.attachments?.map((a) => ({
      name: a.name,
      size: a.content.length,
      mimeType: a.mimeType,
    })) || [],
    status: "sent",
    sentAt: new Date(),
    receiptId: result.receiptId as string | undefined,
  };

  // Log to CachedData for tracking
  const key = `kep_msg:${message.id}`;
  await prisma.cachedData.create({
    data: {
      key,
      value: JSON.parse(JSON.stringify({
        ...message,
        tenderId: request.tenderId,
      })),
      provider: "KEP",
      ttl: 365 * 86400,
      expiresAt: new Date(Date.now() + 365 * 86400_000),
    },
  });

  return message;
}

// ─── Get Message Status ─────────────────────────────────────

export async function getMessageStatus(messageId: string): Promise<KepMessage | null> {
  try {
    const result = await kepFetch(`/messages/${messageId}/status`) as Record<string, unknown>;
    return {
      id: messageId,
      from: result.from as string,
      to: result.recipients as string[],
      subject: result.subject as string,
      body: "",
      attachments: [],
      status: result.status as KepMessage["status"],
      sentAt: new Date(result.sentAt as string),
      deliveredAt: result.deliveredAt ? new Date(result.deliveredAt as string) : undefined,
      readAt: result.readAt ? new Date(result.readAt as string) : undefined,
      receiptId: result.receiptId as string | undefined,
    };
  } catch {
    return null;
  }
}

// ─── Get Inbox ──────────────────────────────────────────────

export async function getInbox(page = 1, limit = 20): Promise<{ messages: KepMessage[]; total: number }> {
  const result = await kepFetch(`/messages/inbox?page=${page}&limit=${limit}`) as Record<string, unknown>;
  const messages = (result.messages as Record<string, unknown>[]).map(mapMessage);
  return { messages, total: result.total as number };
}

// ─── Get Outbox ─────────────────────────────────────────────

export async function getOutbox(page = 1, limit = 20): Promise<{ messages: KepMessage[]; total: number }> {
  const result = await kepFetch(`/messages/outbox?page=${page}&limit=${limit}`) as Record<string, unknown>;
  const messages = (result.messages as Record<string, unknown>[]).map(mapMessage);
  return { messages, total: result.total as number };
}

// ─── Download Receipt ───────────────────────────────────────

export async function getDeliveryReceipt(messageId: string): Promise<Buffer | null> {
  try {
    const config = getConfig();
    const response = await fetch(`${config.apiUrl}/messages/${messageId}/receipt`, {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
    });
    if (!response.ok) return null;
    const data = await response.arrayBuffer();
    return Buffer.from(data);
  } catch {
    return null;
  }
}

// ─── Health Check ───────────────────────────────────────────

export async function kepHealthCheck(): Promise<{ ok: boolean; latencyMs: number; provider: string }> {
  const config = getConfig();
  const start = Date.now();
  try {
    await kepFetch("/health");
    return { ok: true, latencyMs: Date.now() - start, provider: config.provider };
  } catch {
    return { ok: false, latencyMs: Date.now() - start, provider: config.provider };
  }
}

// ─── Helpers ────────────────────────────────────────────────

function mapMessage(raw: Record<string, unknown>): KepMessage {
  return {
    id: raw.id as string,
    from: raw.from as string,
    to: raw.recipients as string[],
    subject: raw.subject as string,
    body: raw.body as string || "",
    attachments: (raw.attachments as { name: string; size: number; mimeType: string }[]) || [],
    status: raw.status as KepMessage["status"],
    sentAt: new Date(raw.sentAt as string),
    deliveredAt: raw.deliveredAt ? new Date(raw.deliveredAt as string) : undefined,
    readAt: raw.readAt ? new Date(raw.readAt as string) : undefined,
    receiptId: raw.receiptId as string | undefined,
  };
}
