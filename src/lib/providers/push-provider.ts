// ─── Web Push Notification Provider ─────────────────────────
// VAPID-based Web Push API for real-time browser notifications

import webpush from "web-push";
import { prisma } from "@/lib/prisma";

// ─── Types ──────────────────────────────────────────────────

export interface PushResult {
  success: boolean;
  sent: number;
  failed: number;
  errors?: string[];
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

// ─── VAPID Configuration ────────────────────────────────────

function configureVapid(): void {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:destek@ihalepro.com";

  if (!publicKey || !privateKey) {
    throw new Error("VAPID_PUBLIC_KEY ve VAPID_PRIVATE_KEY tanımlanmalı");
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
}

// ─── Send Push to User ──────────────────────────────────────

export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<PushResult> {
  configureVapid();

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  if (subscriptions.length === 0) {
    return { success: true, sent: 0, failed: 0 };
  }

  const notification = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || "/icons/icon-192x192.png",
    badge: payload.badge || "/icons/badge-72x72.png",
    data: {
      url: payload.url || "/bildirimler",
      ...payload.data,
    },
    tag: payload.tag,
  });

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        notification,
        { TTL: 86400 }, // 24 hours
      );
      sent++;
    } catch (error) {
      failed++;
      const statusCode = (error as { statusCode?: number }).statusCode;

      // Remove expired/invalid subscriptions
      if (statusCode === 404 || statusCode === 410) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      }

      errors.push(
        `Sub ${sub.id}: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
      );
    }
  }

  return { success: sent > 0 || subscriptions.length === 0, sent, failed, errors };
}

// ─── Send Push to Multiple Users ────────────────────────────

export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload,
): Promise<PushResult> {
  let totalSent = 0;
  let totalFailed = 0;
  const allErrors: string[] = [];

  for (const userId of userIds) {
    const result = await sendPushToUser(userId, payload);
    totalSent += result.sent;
    totalFailed += result.failed;
    if (result.errors) allErrors.push(...result.errors);
  }

  return {
    success: totalSent > 0,
    sent: totalSent,
    failed: totalFailed,
    errors: allErrors.length > 0 ? allErrors : undefined,
  };
}

// ─── Subscribe ──────────────────────────────────────────────

export async function subscribePush(
  userId: string,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
): Promise<{ success: boolean }> {
  await prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    create: {
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    update: {
      userId,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
  });

  return { success: true };
}

// ─── Unsubscribe ────────────────────────────────────────────

export async function unsubscribePush(endpoint: string): Promise<{ success: boolean }> {
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
  return { success: true };
}

// ─── Generate VAPID Keys (one-time setup utility) ───────────

export function generateVapidKeys(): { publicKey: string; privateKey: string } {
  return webpush.generateVAPIDKeys();
}

// ─── Notification Helpers ───────────────────────────────────

export function buildTenderPush(title: string, city: string, tenderId: string): PushPayload {
  return {
    title: "Yeni İhale Eşleşmesi",
    body: `${title.substring(0, 80)} — ${city}`,
    url: `/ihaleler/${tenderId}`,
    tag: `tender-${tenderId}`,
  };
}

export function buildDeadlinePush(title: string, daysLeft: number, tenderId: string): PushPayload {
  return {
    title: daysLeft <= 1 ? "⚠️ Son Gün!" : `Son ${daysLeft} Gün`,
    body: title.substring(0, 100),
    url: `/ihaleler/${tenderId}`,
    tag: `deadline-${tenderId}`,
  };
}

export function buildLegalPush(title: string, updateId: string): PushPayload {
  return {
    title: "Mevzuat Değişikliği",
    body: title.substring(0, 100),
    url: `/mevzuat/${updateId}`,
    tag: `legal-${updateId}`,
  };
}

export function buildSystemPush(title: string, message: string, url?: string): PushPayload {
  return {
    title,
    body: message.substring(0, 120),
    url: url || "/bildirimler",
    tag: `system-${Date.now()}`,
  };
}
