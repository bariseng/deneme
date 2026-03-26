// ─── Admin Reports Service ──────────────────────────────────
// Revenue, user activity, system metrics — admin-only

import { prisma } from "@/lib/prisma";
import { ProviderCache } from "@/lib/providers/cache";

const cache = new ProviderCache();
const CACHE_TTL = 600; // 10 min

// ─── Types ──────────────────────────────────────────────────

export interface UserActivityReport {
  totalUsers: number;
  activeUsersLast30: number;
  newUsersLast30: number;
  planDistribution: { plan: string; count: number }[];
  topActiveUsers: { id: string; name: string; email: string; bidCount: number; loginCount: number }[];
}

export interface RevenueReport {
  totalRevenue: number;
  monthlyRevenue: { month: string; amount: number; txCount: number }[];
  planRevenue: { plan: string; amount: number; subscribers: number }[];
  activeSubscriptions: number;
  churnedSubscriptions: number;
  mrr: number; // Monthly recurring revenue
}

export interface SystemMetrics {
  totalTenders: number;
  totalBids: number;
  totalContracts: number;
  totalDocuments: number;
  totalForumThreads: number;
  avgResponseTimeMs: number;
  errorRate: number;
  storageUsedMb: number;
}

// ─── User Activity Report ───────────────────────────────────

export async function getUserActivityReport(): Promise<UserActivityReport> {
  const cacheKey = "admin_user_activity";
  const cached = await cache.get<UserActivityReport>(cacheKey);
  if (cached) return cached;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

  const [totalUsers, newUsersLast30, planGroups, topUsers] = await Promise.all([
    prisma.user.count(),

    prisma.user.count({
      where: { createdAt: { gte: thirtyDaysAgo } },
    }),

    prisma.user.groupBy({
      by: ["plan"],
      _count: true,
    }),

    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        _count: { select: { bids: true } },
      },
      orderBy: { bids: { _count: "desc" } },
      take: 10,
    }),
  ]);

  // Active users = users who have bids or applications in last 30 days
  const activeUsersLast30 = await prisma.user.count({
    where: {
      OR: [
        { bids: { some: { createdAt: { gte: thirtyDaysAgo } } } },
        { applications: { some: { createdAt: { gte: thirtyDaysAgo } } } },
        { notifications: { some: { createdAt: { gte: thirtyDaysAgo } } } },
      ],
    },
  });

  const report: UserActivityReport = {
    totalUsers,
    activeUsersLast30,
    newUsersLast30,
    planDistribution: planGroups.map((g) => ({ plan: g.plan, count: g._count })),
    topActiveUsers: topUsers.map((u) => ({
      id: u.id,
      name: u.name || "İsimsiz",
      email: u.email,
      bidCount: u._count.bids,
      loginCount: 0, // Would need session tracking
    })),
  };

  await cache.set(cacheKey, report, { ttl: CACHE_TTL, staleWhileRevalidate: true, key: "act" }, "ADMIN");
  return report;
}

// ─── Revenue Report (from iyzico payments) ──────────────────

export async function getRevenueReport(): Promise<RevenueReport> {
  const cacheKey = "admin_revenue";
  const cached = await cache.get<RevenueReport>(cacheKey);
  if (cached) return cached;

  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const [payments, subscriptions, cancelledSubs] = await Promise.all([
    prisma.payment.findMany({
      where: {
        status: "completed",
        createdAt: { gte: twelveMonthsAgo },
      },
      select: { amount: true, planId: true, createdAt: true },
    }),

    prisma.subscription.count({
      where: { status: "active" },
    }),

    prisma.subscription.count({
      where: { status: "cancelled", cancelledAt: { gte: new Date(Date.now() - 30 * 86400000) } },
    }),
  ]);

  // Monthly revenue
  const monthlyMap = new Map<string, { amount: number; txCount: number }>();
  for (const p of payments) {
    const key = `${p.createdAt.getFullYear()}-${String(p.createdAt.getMonth() + 1).padStart(2, "0")}`;
    const existing = monthlyMap.get(key) || { amount: 0, txCount: 0 };
    existing.amount += Number(p.amount);
    existing.txCount++;
    monthlyMap.set(key, existing);
  }

  const monthlyRevenue = [...monthlyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      amount: Math.round(data.amount * 100) / 100,
      txCount: data.txCount,
    }));

  // Plan-based revenue
  const planMap = new Map<string, { amount: number; subscribers: number }>();
  for (const p of payments) {
    const existing = planMap.get(p.planId) || { amount: 0, subscribers: 0 };
    existing.amount += Number(p.amount);
    existing.subscribers++;
    planMap.set(p.planId, existing);
  }

  const planRevenue = [...planMap.entries()].map(([plan, data]) => ({
    plan,
    amount: Math.round(data.amount * 100) / 100,
    subscribers: data.subscribers,
  }));

  const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  // MRR = last month's revenue
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const lastMonthKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}`;
  const mrr = monthlyMap.get(lastMonthKey)?.amount || 0;

  const report: RevenueReport = {
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    monthlyRevenue,
    planRevenue,
    activeSubscriptions: subscriptions,
    churnedSubscriptions: cancelledSubs,
    mrr: Math.round(mrr * 100) / 100,
  };

  await cache.set(cacheKey, report, { ttl: CACHE_TTL, staleWhileRevalidate: true, key: "rev" }, "ADMIN");
  return report;
}

// ─── System Metrics ─────────────────────────────────────────

export async function getSystemMetrics(): Promise<SystemMetrics> {
  const cacheKey = "admin_system_metrics";
  const cached = await cache.get<SystemMetrics>(cacheKey);
  if (cached) return cached;

  const [totalTenders, totalBids, totalContracts, totalDocuments, totalForumThreads] =
    await Promise.all([
      prisma.tender.count(),
      prisma.bid.count(),
      prisma.contract.count(),
      prisma.tenderDocument.count(),
      prisma.forumThread.count(),
    ]);

  // Approximate storage from document file sizes (stored as string)
  const docs = await prisma.tenderDocument.findMany({
    where: { fileSize: { not: null } },
    select: { fileSize: true },
  });
  const totalBytes = docs.reduce((sum, d) => sum + (parseInt(d.fileSize || "0", 10) || 0), 0);

  const metrics: SystemMetrics = {
    totalTenders,
    totalBids,
    totalContracts,
    totalDocuments,
    totalForumThreads,
    avgResponseTimeMs: 0, // Would need APM integration
    errorRate: 0,
    storageUsedMb: Math.round(totalBytes / (1024 * 1024)),
  };

  await cache.set(cacheKey, metrics, { ttl: CACHE_TTL, staleWhileRevalidate: true, key: "sys" }, "ADMIN");
  return metrics;
}
