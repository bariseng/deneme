import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import type { TenantPlan, ReferralStatus } from "@/generated/prisma/client";

// ─── TENANT MANAGEMENT ────────────────────────────────────

export async function createTenant(
  ownerId: string,
  data: { name: string; slug: string; logo?: string; primaryColor?: string; plan?: TenantPlan }
) {
  return prisma.tenant.create({
    data: {
      ownerId,
      name: data.name,
      slug: data.slug.toLowerCase().replace(/[^a-z0-9-]/g, ""),
      logo: data.logo,
      primaryColor: data.primaryColor || "#1a56db",
      plan: data.plan || "STARTER",
    },
  });
}

export async function getUserTenants(userId: string) {
  const tenants = await prisma.tenant.findMany({
    where: { ownerId: userId },
    include: {
      _count: { select: { apiKeys: true, webhooks: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return JSON.parse(JSON.stringify(tenants));
}

export async function updateTenant(
  tenantId: string,
  ownerId: string,
  data: Partial<{ name: string; logo: string; favicon: string; primaryColor: string; secondaryColor: string; customDomain: string; settings: Record<string, unknown>; isActive: boolean }>
) {
  const { settings, ...rest } = data;
  return prisma.tenant.updateMany({
    where: { id: tenantId, ownerId },
    data: {
      ...rest,
      ...(settings !== undefined ? { settings: JSON.parse(JSON.stringify(settings)) } : {}),
    },
  });
}

export async function deleteTenant(tenantId: string, ownerId: string) {
  return prisma.tenant.deleteMany({ where: { id: tenantId, ownerId } });
}

// ─── API KEY MANAGEMENT ──────────────────────────────────

function generateApiKey(): { key: string; hash: string; prefix: string } {
  const raw = `ihp_${crypto.randomBytes(32).toString("hex")}`;
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  const prefix = raw.substring(0, 12);
  return { key: raw, hash, prefix };
}

export async function createApiKey(
  userId: string,
  data: { name: string; tenantId?: string; permissions?: string[]; rateLimit?: number; expiresAt?: Date }
) {
  const { key, hash, prefix } = generateApiKey();

  const apiKey = await prisma.apiKey.create({
    data: {
      userId,
      tenantId: data.tenantId,
      name: data.name,
      key: hash,
      prefix,
      permissions: data.permissions || ["tenders:read", "tenders:search"],
      rateLimit: data.rateLimit || 1000,
      expiresAt: data.expiresAt,
    },
  });

  // Return the raw key only once — it won't be retrievable again
  return { ...JSON.parse(JSON.stringify(apiKey)), rawKey: key };
}

export async function getUserApiKeys(userId: string) {
  const keys = await prisma.apiKey.findMany({
    where: { userId },
    include: {
      tenant: { select: { name: true, slug: true } },
      _count: { select: { usage: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return JSON.parse(JSON.stringify(keys));
}

export async function revokeApiKey(apiKeyId: string, userId: string) {
  return prisma.apiKey.updateMany({
    where: { id: apiKeyId, userId },
    data: { isActive: false },
  });
}

export async function deleteApiKey(apiKeyId: string, userId: string) {
  return prisma.apiKey.deleteMany({ where: { id: apiKeyId, userId } });
}

// ─── API USAGE TRACKING ──────────────────────────────────

export async function trackApiUsage(
  apiKeyId: string,
  data: { endpoint: string; method: string; statusCode: number; responseTime: number; ipAddress?: string; userAgent?: string }
) {
  await prisma.apiKey.update({
    where: { id: apiKeyId },
    data: { lastUsedAt: new Date() },
  });

  return prisma.apiUsage.create({
    data: {
      apiKeyId,
      endpoint: data.endpoint,
      method: data.method,
      statusCode: data.statusCode,
      responseTime: data.responseTime,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    },
  });
}

export async function getApiUsageStats(userId: string, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const keys = await prisma.apiKey.findMany({
    where: { userId },
    select: { id: true },
  });
  const keyIds = keys.map((k) => k.id);

  if (keyIds.length === 0) return { totalRequests: 0, avgResponseTime: 0, errorRate: 0, dailyUsage: [], topEndpoints: [] };

  const [total, errors, avgTime, dailyUsage, topEndpoints] = await Promise.all([
    prisma.apiUsage.count({ where: { apiKeyId: { in: keyIds }, date: { gte: since } } }),
    prisma.apiUsage.count({ where: { apiKeyId: { in: keyIds }, date: { gte: since }, statusCode: { gte: 400 } } }),
    prisma.apiUsage.aggregate({ where: { apiKeyId: { in: keyIds }, date: { gte: since } }, _avg: { responseTime: true } }),
    prisma.apiUsage.groupBy({
      by: ["date"],
      where: { apiKeyId: { in: keyIds }, date: { gte: since } },
      _count: true,
      orderBy: { date: "asc" },
    }),
    prisma.apiUsage.groupBy({
      by: ["endpoint"],
      where: { apiKeyId: { in: keyIds }, date: { gte: since } },
      _count: true,
      orderBy: { _count: { endpoint: "desc" } },
      take: 10,
    }),
  ]);

  return {
    totalRequests: total,
    avgResponseTime: Math.round(avgTime._avg.responseTime || 0),
    errorRate: total > 0 ? Math.round((errors / total) * 100 * 10) / 10 : 0,
    dailyUsage: JSON.parse(JSON.stringify(dailyUsage)),
    topEndpoints: JSON.parse(JSON.stringify(topEndpoints)),
  };
}

// ─── WEBHOOK MANAGEMENT ──────────────────────────────────

export async function createWebhook(
  userId: string,
  data: { url: string; events: string[]; tenantId?: string }
) {
  const secret = crypto.randomBytes(32).toString("hex");
  return prisma.webhook.create({
    data: {
      userId,
      tenantId: data.tenantId,
      url: data.url,
      events: data.events,
      secret,
    },
  });
}

export async function getUserWebhooks(userId: string) {
  const webhooks = await prisma.webhook.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return JSON.parse(JSON.stringify(webhooks));
}

export async function updateWebhook(
  webhookId: string,
  data: Partial<{ url: string; events: string[]; isActive: boolean }>
) {
  return prisma.webhook.update({ where: { id: webhookId }, data });
}

export async function deleteWebhook(webhookId: string) {
  return prisma.webhook.delete({ where: { id: webhookId } });
}

export async function fireWebhook(event: string, payload: unknown) {
  const webhooks = await prisma.webhook.findMany({
    where: { isActive: true, events: { has: event } },
  });

  const results = await Promise.allSettled(
    webhooks.map(async (wh) => {
      const body = JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() });
      const signature = crypto.createHmac("sha256", wh.secret).update(body).digest("hex");

      const res = await fetch(wh.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
          "X-Webhook-Event": event,
        },
        body,
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        await prisma.webhook.update({
          where: { id: wh.id },
          data: { failCount: { increment: 1 } },
        });
        throw new Error(`Webhook failed: ${res.status}`);
      }

      await prisma.webhook.update({
        where: { id: wh.id },
        data: { lastSentAt: new Date(), failCount: 0 },
      });
    })
  );

  return results;
}

// ─── PARTNER REFERRAL ────────────────────────────────────

export async function createReferralCode(partnerId: string) {
  const code = `REF_${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
  return prisma.partnerReferral.create({
    data: {
      partnerId,
      referralCode: code,
    },
  });
}

export async function getPartnerReferrals(partnerId: string) {
  const referrals = await prisma.partnerReferral.findMany({
    where: { partnerId },
    include: {
      referredUser: { select: { id: true, name: true, email: true, plan: true, createdAt: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return JSON.parse(JSON.stringify(referrals));
}

export async function claimReferral(referralCode: string, userId: string) {
  const referral = await prisma.partnerReferral.findUnique({ where: { referralCode } });
  if (!referral) throw new Error("Referans kodu bulunamadı");
  if (referral.referredUserId) throw new Error("Bu referans kodu zaten kullanılmış");
  if (referral.partnerId === userId) throw new Error("Kendi referans kodunuzu kullanamazsınız");

  return prisma.partnerReferral.update({
    where: { referralCode },
    data: { referredUserId: userId, status: "ONAYLANDI" },
  });
}

export async function getPartnerStats(partnerId: string) {
  const referrals = await prisma.partnerReferral.findMany({ where: { partnerId } });
  const totalReferrals = referrals.length;
  const claimed = referrals.filter((r) => r.referredUserId).length;
  const totalCommission = referrals.reduce((s, r) => s + Number(r.commission), 0);
  const paidCommission = referrals.filter((r) => r.status === "ODENDI").reduce((s, r) => s + Number(r.commission), 0);

  return { totalReferrals, claimed, totalCommission, paidCommission, pendingCommission: totalCommission - paidCommission };
}

// ─── WEBHOOK EVENTS ──────────────────────────────────────

export const WEBHOOK_EVENTS = [
  { key: "tender.created", label: "Yeni ihale eklendi" },
  { key: "tender.updated", label: "İhale güncellendi" },
  { key: "tender.deadline", label: "Son başvuru tarihi yaklaşıyor" },
  { key: "result.announced", label: "İhale sonucu açıklandı" },
  { key: "bid.submitted", label: "Teklif gönderildi" },
  { key: "document.uploaded", label: "Belge yüklendi" },
  { key: "notification.created", label: "Bildirim oluşturuldu" },
];

// ─── API PERMISSIONS ─────────────────────────────────────

export const API_PERMISSIONS = [
  { key: "tenders:read", label: "İhale Okuma", description: "İhale detaylarını görüntüleme" },
  { key: "tenders:search", label: "İhale Arama", description: "İhale arama API'si" },
  { key: "bids:read", label: "Teklif Okuma", description: "Teklif detaylarını görüntüleme" },
  { key: "bids:write", label: "Teklif Yazma", description: "Teklif oluşturma ve güncelleme" },
  { key: "notifications:read", label: "Bildirim Okuma", description: "Bildirimleri görüntüleme" },
  { key: "analytics:read", label: "Analitik Okuma", description: "Raporlama verilerine erişim" },
  { key: "documents:read", label: "Belge Okuma", description: "Belgeleri görüntüleme" },
  { key: "webhooks:manage", label: "Webhook Yönetimi", description: "Webhook CRUD işlemleri" },
];
