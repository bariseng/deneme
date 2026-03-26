// ─── Notification Orchestrator ───────────────────────────────
// Multi-channel routing based on user preferences + rate limiting

import { prisma } from "@/lib/prisma";
import { sendSms, sendDeadlineReminder } from "@/lib/providers/sms-provider";
import {
  sendEmail,
  sendTenderMatchEmail,
  sendDeadlineReminderEmail,
  sendLegalUpdateEmail,
  sendPaymentConfirmation,
} from "@/lib/providers/email-provider";
import {
  sendPushToUser,
  buildTenderPush,
  buildDeadlinePush,
  buildLegalPush,
  buildSystemPush,
} from "@/lib/providers/push-provider";

// ─── Types ──────────────────────────────────────────────────

export type NotificationChannel = "email" | "sms" | "push" | "whatsapp" | "in_app";

export type NotificationCategory =
  | "tender_match"
  | "deadline"
  | "legal_update"
  | "payment"
  | "system"
  | "daily_digest";

export interface NotificationRequest {
  userId: string;
  category: NotificationCategory;
  title: string;
  message: string;
  data?: Record<string, string>;
  channels?: NotificationChannel[]; // Override user prefs
  priority?: "low" | "normal" | "high" | "urgent";
}

export interface NotificationResult {
  inApp: boolean;
  email: boolean;
  sms: boolean;
  push: boolean;
  whatsapp: boolean;
  rateLimited: boolean;
}

interface UserPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  whatsapp: boolean;
  dailyDigest: boolean;
  quietHoursStart?: number; // 22 = 10 PM
  quietHoursEnd?: number;   // 8 = 8 AM
}

// ─── Daily limits per channel ───────────────────────────────

const DAILY_LIMITS: Record<string, number> = {
  email: 20,
  sms: 10,
  push: 30,
  whatsapp: 5,
  in_app: 50,
};

// ─── Priority → channel mapping ─────────────────────────────

const PRIORITY_CHANNELS: Record<string, NotificationChannel[]> = {
  low: ["in_app"],
  normal: ["in_app", "push"],
  high: ["in_app", "push", "email"],
  urgent: ["in_app", "push", "email", "sms"],
};

// ─── Main Send Function ─────────────────────────────────────

export async function sendNotification(
  req: NotificationRequest,
): Promise<NotificationResult> {
  const result: NotificationResult = {
    inApp: false,
    email: false,
    sms: false,
    push: false,
    whatsapp: false,
    rateLimited: false,
  };

  // 1. Get user and preferences
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, email: true, phone: true, name: true, plan: true },
  });

  if (!user) return result;

  const prefs = await getUserPreferences(req.userId);
  const channels = req.channels || resolveChannels(req.category, req.priority || "normal", prefs);

  // 2. Check quiet hours
  if (isQuietHours(prefs) && req.priority !== "urgent") {
    // During quiet hours, only in-app
    channels.length = 0;
    channels.push("in_app");
  }

  // 3. Send to each channel
  for (const channel of channels) {
    // Rate limit check
    const allowed = await checkChannelLimit(req.userId, channel);
    if (!allowed) {
      result.rateLimited = true;
      continue;
    }

    switch (channel) {
      case "in_app":
        result.inApp = await sendInApp(req);
        break;
      case "email":
        if (user.email && prefs.email) {
          result.email = await sendEmailNotification(user.email, req);
        }
        break;
      case "sms":
        if (user.phone && prefs.sms) {
          result.sms = await sendSmsNotification(user.phone, req);
        }
        break;
      case "push":
        if (prefs.push) {
          result.push = await sendPushNotification(req.userId, req);
        }
        break;
      case "whatsapp":
        if (user.phone && prefs.whatsapp) {
          result.whatsapp = await sendWhatsAppNotification(user.phone, req);
        }
        break;
    }

    // Increment usage counter
    await incrementChannelCount(req.userId, channel);
  }

  return result;
}

// ─── Batch Send (multiple users) ────────────────────────────

export async function sendBatchNotification(
  userIds: string[],
  category: NotificationCategory,
  title: string,
  message: string,
  data?: Record<string, string>,
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const userId of userIds) {
    try {
      const result = await sendNotification({ userId, category, title, message, data });
      if (result.inApp || result.email || result.push || result.sms) sent++;
      else failed++;
    } catch {
      failed++;
    }
  }

  return { sent, failed };
}

// ─── Channel-specific senders ───────────────────────────────

async function sendInApp(req: NotificationRequest): Promise<boolean> {
  try {
    const typeMap: Record<NotificationCategory, string> = {
      tender_match: "YENI_IHALE",
      deadline: "SON_BASVURU",
      legal_update: "SISTEM",
      payment: "SISTEM",
      system: "SISTEM",
      daily_digest: "SISTEM",
    };

    await prisma.notification.create({
      data: {
        userId: req.userId,
        type: typeMap[req.category] as "YENI_IHALE" | "SON_BASVURU" | "ZEYILNAME" | "SONUC" | "SISTEM",
        title: req.title,
        message: req.message.substring(0, 500),
        link: req.data?.url || req.data?.tenderId ? `/ihaleler/${req.data.tenderId}` : undefined,
        tenderId: req.data?.tenderId,
      },
    });
    return true;
  } catch {
    return false;
  }
}

async function sendEmailNotification(email: string, req: NotificationRequest): Promise<boolean> {
  try {
    switch (req.category) {
      case "tender_match":
        if (req.data?.tenders) {
          const tenders = JSON.parse(req.data.tenders);
          const r = await sendTenderMatchEmail(email, tenders);
          return r.success;
        }
        break;
      case "deadline":
        if (req.data?.tenderId) {
          const r = await sendDeadlineReminderEmail(
            email, req.title, parseInt(req.data.daysLeft || "0"), req.data.tenderId,
          );
          return r.success;
        }
        break;
      case "legal_update":
        if (req.data?.updateId) {
          const r = await sendLegalUpdateEmail(email, req.title, req.message, req.data.updateId);
          return r.success;
        }
        break;
      case "payment":
        if (req.data?.planName) {
          const r = await sendPaymentConfirmation(
            email, req.data.planName, parseFloat(req.data.amount || "0"), req.data.period || "monthly",
          );
          return r.success;
        }
        break;
    }

    // Default: generic email
    const r = await sendEmail({
      to: email,
      subject: req.title,
      html: `<h2>${req.title}</h2><p>${req.message}</p>`,
    });
    return r.success;
  } catch {
    return false;
  }
}

async function sendSmsNotification(phone: string, req: NotificationRequest): Promise<boolean> {
  try {
    if (req.category === "deadline" && req.data?.daysLeft) {
      const r = await sendDeadlineReminder(
        req.userId, phone, req.title, parseInt(req.data.daysLeft),
      );
      return r.success;
    }

    const r = await sendSms({
      to: phone,
      message: `İhalePro: ${req.title} — ${req.message.substring(0, 120)}`,
      userId: req.userId,
    });
    return r.success;
  } catch {
    return false;
  }
}

async function sendPushNotification(userId: string, req: NotificationRequest): Promise<boolean> {
  try {
    let payload;
    switch (req.category) {
      case "tender_match":
        payload = buildTenderPush(req.title, req.data?.city || "", req.data?.tenderId || "");
        break;
      case "deadline":
        payload = buildDeadlinePush(req.title, parseInt(req.data?.daysLeft || "0"), req.data?.tenderId || "");
        break;
      case "legal_update":
        payload = buildLegalPush(req.title, req.data?.updateId || "");
        break;
      default:
        payload = buildSystemPush(req.title, req.message, req.data?.url);
    }

    const r = await sendPushToUser(userId, payload);
    return r.success;
  } catch {
    return false;
  }
}

async function sendWhatsAppNotification(phone: string, req: NotificationRequest): Promise<boolean> {
  try {
    const { sendTenderNotification, sendDeadlineWhatsApp, sendLegalWhatsApp } =
      await import("@/lib/providers/whatsapp-provider");

    switch (req.category) {
      case "tender_match":
        return (await sendTenderNotification(phone, req.title, req.data?.city || "", req.data?.deadline || "")).success;
      case "deadline":
        return (await sendDeadlineWhatsApp(phone, req.title, parseInt(req.data?.daysLeft || "0"))).success;
      case "legal_update":
        return (await sendLegalWhatsApp(phone, req.title, req.message)).success;
    }
    return false;
  } catch {
    return false;
  }
}

// ─── Preferences ────────────────────────────────────────────

async function getUserPreferences(userId: string): Promise<UserPreferences> {
  // Check notification rules for channel preferences
  const rules = await prisma.notificationRule.findMany({
    where: { userId, isActive: true },
    take: 1,
  });

  return {
    email: rules[0]?.emailNotify ?? true,
    sms: false, // SMS opt-in required
    push: rules[0]?.pushNotify ?? false,
    whatsapp: false, // WhatsApp opt-in required
    dailyDigest: false,
    quietHoursStart: 22,
    quietHoursEnd: 8,
  };
}

function resolveChannels(
  category: NotificationCategory,
  priority: string,
  prefs: UserPreferences,
): NotificationChannel[] {
  const priorityChannels = PRIORITY_CHANNELS[priority] || PRIORITY_CHANNELS.normal;
  return priorityChannels.filter((ch) => {
    if (ch === "in_app") return true;
    if (ch === "email") return prefs.email;
    if (ch === "sms") return prefs.sms;
    if (ch === "push") return prefs.push;
    if (ch === "whatsapp") return prefs.whatsapp;
    return false;
  });
}

function isQuietHours(prefs: UserPreferences): boolean {
  if (!prefs.quietHoursStart || !prefs.quietHoursEnd) return false;
  const hour = new Date().getHours();
  if (prefs.quietHoursStart > prefs.quietHoursEnd) {
    // e.g., 22-8 (crosses midnight)
    return hour >= prefs.quietHoursStart || hour < prefs.quietHoursEnd;
  }
  return hour >= prefs.quietHoursStart && hour < prefs.quietHoursEnd;
}

// ─── Rate Limiting ──────────────────────────────────────────

async function checkChannelLimit(userId: string, channel: string): Promise<boolean> {
  const limit = DAILY_LIMITS[channel] || 20;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const count = await prisma.notification.count({
    where: { userId, createdAt: { gte: today } },
  });

  return count < limit;
}

async function incrementChannelCount(_userId: string, _channel: string): Promise<void> {
  // Channel count tracked implicitly via notification records in DB
}
