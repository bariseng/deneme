/**
 * Premium Quota & Credit Management
 * Plan-based feature limits, AI credit tracking, usage enforcement
 */

import { prisma } from "@/lib/prisma";

// ─── Plan Limits ─────────────────────────────────────────

export type Feature =
  | "tender_view"
  | "favorite"
  | "notification"
  | "bid"
  | "ai_credit"
  | "competitor";

export interface PlanLimits {
  tender_view: number;  // daily
  favorite: number;     // total
  notification: number; // daily
  bid: number;          // monthly
  ai_credit: number;    // monthly
  competitor: number;   // total tracked
}

const PLAN_LIMITS: Record<string, PlanLimits> = {
  FREE: {
    tender_view: 10,
    favorite: 3,
    notification: 5,
    bid: 0,
    ai_credit: 0,
    competitor: 0,
  },
  STARTER: {
    tender_view: -1, // unlimited
    favorite: -1,
    notification: -1,
    bid: 20,
    ai_credit: 50,
    competitor: 5,
  },
  PRO: {
    tender_view: -1,
    favorite: -1,
    notification: -1,
    bid: 20,
    ai_credit: 50,
    competitor: 5,
  },
  ENTERPRISE: {
    tender_view: -1,
    favorite: -1,
    notification: -1,
    bid: -1,
    ai_credit: -1,
    competitor: -1,
  },
};

export function getPlanLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.FREE;
}

// ─── Quota Management ────────────────────────────────────

export async function ensureQuotas(userId: string, plan: string): Promise<void> {
  const limits = getPlanLimits(plan);
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const features: { feature: Feature; limit: number; resetAt: Date }[] = [
    { feature: "tender_view", limit: limits.tender_view, resetAt: tomorrow },
    { feature: "favorite", limit: limits.favorite, resetAt: nextMonth },
    { feature: "notification", limit: limits.notification, resetAt: tomorrow },
    { feature: "bid", limit: limits.bid, resetAt: nextMonth },
    { feature: "ai_credit", limit: limits.ai_credit, resetAt: nextMonth },
    { feature: "competitor", limit: limits.competitor, resetAt: nextMonth },
  ];

  for (const f of features) {
    await prisma.usageQuota.upsert({
      where: { userId_feature: { userId, feature: f.feature } },
      create: {
        userId,
        feature: f.feature,
        used: 0,
        limit: f.limit,
        resetAt: f.resetAt,
      },
      update: {
        limit: f.limit,
      },
    });
  }
}

export async function checkQuota(
  userId: string,
  feature: Feature
): Promise<{ allowed: boolean; used: number; limit: number; remaining: number }> {
  const quota = await prisma.usageQuota.findUnique({
    where: { userId_feature: { userId, feature } },
  });

  if (!quota) {
    return { allowed: true, used: 0, limit: -1, remaining: -1 };
  }

  // Check if reset is needed
  if (quota.resetAt <= new Date()) {
    await resetQuota(userId, feature);
    return { allowed: true, used: 0, limit: quota.limit, remaining: quota.limit };
  }

  // Unlimited
  if (quota.limit === -1) {
    return { allowed: true, used: quota.used, limit: -1, remaining: -1 };
  }

  const remaining = quota.limit - quota.used;
  return {
    allowed: remaining > 0,
    used: quota.used,
    limit: quota.limit,
    remaining: Math.max(0, remaining),
  };
}

export async function incrementUsage(
  userId: string,
  feature: Feature,
  amount: number = 1
): Promise<{ success: boolean; used: number; limit: number }> {
  const check = await checkQuota(userId, feature);

  if (!check.allowed) {
    return { success: false, used: check.used, limit: check.limit };
  }

  const quota = await prisma.usageQuota.update({
    where: { userId_feature: { userId, feature } },
    data: { used: { increment: amount } },
  });

  return { success: true, used: quota.used, limit: quota.limit };
}

async function resetQuota(userId: string, feature: Feature): Promise<void> {
  const now = new Date();
  let nextReset: Date;

  if (feature === "tender_view" || feature === "notification") {
    nextReset = new Date(now);
    nextReset.setDate(nextReset.getDate() + 1);
    nextReset.setHours(0, 0, 0, 0);
  } else {
    nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }

  await prisma.usageQuota.update({
    where: { userId_feature: { userId, feature } },
    data: { used: 0, resetAt: nextReset },
  });
}

// ─── AI Credit Management ────────────────────────────────

export async function useAICredit(
  userId: string,
  featureName: string,
  description: string
): Promise<{ success: boolean; remaining: number; message?: string }> {
  const check = await checkQuota(userId, "ai_credit");

  if (!check.allowed) {
    return {
      success: false,
      remaining: 0,
      message: "AI kredi limitiniz doldu. Planınızı yükselterek devam edebilirsiniz.",
    };
  }

  // Increment usage
  await incrementUsage(userId, "ai_credit");

  // Get current balance
  const lastTx = await prisma.creditTransaction.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  const currentBalance = lastTx?.balance ?? check.limit;
  const newBalance = currentBalance - 1;

  // Log transaction
  await prisma.creditTransaction.create({
    data: {
      userId,
      type: "debit",
      amount: -1,
      balance: Math.max(0, newBalance),
      description,
      feature: featureName,
    },
  });

  return { success: true, remaining: check.remaining - 1 };
}

export async function getAICreditBalance(userId: string): Promise<{
  used: number;
  limit: number;
  remaining: number;
  unlimited: boolean;
}> {
  const check = await checkQuota(userId, "ai_credit");
  return {
    used: check.used,
    limit: check.limit,
    remaining: check.limit === -1 ? -1 : check.remaining,
    unlimited: check.limit === -1,
  };
}

// ─── Usage Summary ───────────────────────────────────────

export async function getUsageSummary(userId: string): Promise<{
  quotas: { feature: string; used: number; limit: number; remaining: number; resetAt: Date }[];
  creditHistory: { type: string; amount: number; balance: number; description: string; createdAt: Date }[];
  trial: { active: boolean; daysLeft: number; plan: string } | null;
}> {
  const [quotas, creditHistory, trial] = await Promise.all([
    prisma.usageQuota.findMany({
      where: { userId },
      orderBy: { feature: "asc" },
    }),
    prisma.creditTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.trialPeriod.findUnique({
      where: { userId },
    }),
  ]);

  // Auto-reset expired quotas
  const now = new Date();
  const processedQuotas = quotas.map((q) => {
    const isExpired = q.resetAt <= now;
    return {
      feature: q.feature,
      used: isExpired ? 0 : q.used,
      limit: q.limit,
      remaining: q.limit === -1 ? -1 : Math.max(0, q.limit - (isExpired ? 0 : q.used)),
      resetAt: q.resetAt,
    };
  });

  let trialInfo = null;
  if (trial && !trial.converted && !trial.cancelledAt) {
    const daysLeft = Math.max(0, Math.ceil((trial.endDate.getTime() - now.getTime()) / 86400000));
    if (daysLeft > 0) {
      trialInfo = { active: true, daysLeft, plan: trial.plan };
    }
  }

  return {
    quotas: processedQuotas,
    creditHistory: creditHistory.map((tx) => ({
      type: tx.type,
      amount: tx.amount,
      balance: tx.balance,
      description: tx.description,
      createdAt: tx.createdAt,
    })),
    trial: trialInfo,
  };
}

// ─── Trial Management ────────────────────────────────────

export async function startTrial(userId: string): Promise<{
  success: boolean;
  endDate?: Date;
  message?: string;
}> {
  const existing = await prisma.trialPeriod.findUnique({
    where: { userId },
  });

  if (existing) {
    return { success: false, message: "Daha önce deneme süresi kullandınız" };
  }

  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 14); // 14 days

  await prisma.trialPeriod.create({
    data: {
      userId,
      plan: "PRO",
      endDate,
    },
  });

  // Upgrade user plan temporarily
  await prisma.user.update({
    where: { id: userId },
    data: { plan: "PRO" },
  });

  // Initialize PRO quotas
  await ensureQuotas(userId, "PRO");

  // Add initial AI credits
  await prisma.creditTransaction.create({
    data: {
      userId,
      type: "credit",
      amount: 50,
      balance: 50,
      description: "14 günlük Profesyonel deneme süresi başlangıç kredisi",
    },
  });

  return { success: true, endDate };
}

// ─── Plan Upgrade ────────────────────────────────────────

export async function upgradePlan(
  userId: string,
  newPlan: string
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { plan: newPlan as "FREE" | "STARTER" | "PRO" | "ENTERPRISE" },
  });

  await ensureQuotas(userId, newPlan);

  // Reset AI credits for new plan
  const limits = getPlanLimits(newPlan);
  if (limits.ai_credit !== 0) {
    await prisma.creditTransaction.create({
      data: {
        userId,
        type: "reset",
        amount: limits.ai_credit === -1 ? 999 : limits.ai_credit,
        balance: limits.ai_credit === -1 ? 999 : limits.ai_credit,
        description: `Plan yükseltme: ${newPlan} — kredi yenilendi`,
      },
    });
  }

  // Mark trial as converted if exists
  await prisma.trialPeriod.updateMany({
    where: { userId, converted: false },
    data: { converted: true },
  });
}
