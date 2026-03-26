// ─── Audit Log Service ──────────────────────────────────────
// Logs critical operations with IP, user-agent, timestamps
// 90-day retention with archival

import { prisma } from "@/lib/prisma";

// ─── Types ──────────────────────────────────────────────────

type Severity = "info" | "warning" | "critical";

interface AuditLogEntry {
  userId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  severity?: Severity;
  metadata?: Record<string, unknown>;
}

interface AuditLogQuery {
  userId?: string;
  action?: string;
  entityType?: string;
  severity?: Severity;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}

// ─── Core Logging ───────────────────────────────────────────

export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    await prisma.securityAuditLog.create({
      data: {
        userId: entry.userId || null,
        action: entry.action,
        entityType: entry.entityType || null,
        entityId: entry.entityId || null,
        oldValue: entry.oldValue ? JSON.parse(JSON.stringify(entry.oldValue)) : null,
        newValue: entry.newValue ? JSON.parse(JSON.stringify(entry.newValue)) : null,
        ipAddress: entry.ipAddress || null,
        userAgent: entry.userAgent || null,
        severity: entry.severity || "info",
        metadata: entry.metadata ? JSON.parse(JSON.stringify(entry.metadata)) : null,
      },
    });
  } catch (error) {
    // Audit logging should never break the main flow
    console.error("Audit log write failed:", error);
  }
}

// ─── Convenience Loggers ────────────────────────────────────

export async function logLogin(userId: string, ip: string, userAgent: string, success: boolean): Promise<void> {
  await logAudit({
    userId,
    action: success ? "user.login" : "user.login_failed",
    entityType: "User",
    entityId: userId,
    ipAddress: ip,
    userAgent,
    severity: success ? "info" : "warning",
    metadata: { success },
  });
}

export async function logPayment(
  userId: string,
  paymentId: string,
  amount: number,
  ip: string,
): Promise<void> {
  await logAudit({
    userId,
    action: "payment.completed",
    entityType: "Payment",
    entityId: paymentId,
    ipAddress: ip,
    severity: "info",
    newValue: { amount },
  });
}

export async function logDataAccess(
  userId: string,
  entityType: string,
  entityId: string,
  ip: string,
): Promise<void> {
  await logAudit({
    userId,
    action: "data.access",
    entityType,
    entityId,
    ipAddress: ip,
    severity: "info",
  });
}

export async function logDataDeletion(userId: string, dataTypes: string[], ip: string): Promise<void> {
  await logAudit({
    userId,
    action: "kvkk.data_deletion",
    entityType: "User",
    entityId: userId,
    ipAddress: ip,
    severity: "critical",
    metadata: { dataTypes },
  });
}

export async function logSuspiciousActivity(
  userId: string | null,
  action: string,
  ip: string,
  details: Record<string, unknown>,
): Promise<void> {
  await logAudit({
    userId,
    action: `suspicious.${action}`,
    ipAddress: ip,
    severity: "critical",
    metadata: details,
  });
}

// ─── Query ──────────────────────────────────────────────────

export async function queryAuditLogs(query: AuditLogQuery) {
  const page = query.page || 1;
  const limit = Math.min(query.limit || 50, 100);

  const where: Record<string, unknown> = {};
  if (query.userId) where.userId = query.userId;
  if (query.action) where.action = { contains: query.action };
  if (query.entityType) where.entityType = query.entityType;
  if (query.severity) where.severity = query.severity;
  if (query.from || query.to) {
    where.createdAt = {};
    if (query.from) (where.createdAt as Record<string, unknown>).gte = query.from;
    if (query.to) (where.createdAt as Record<string, unknown>).lte = query.to;
  }

  const [logs, total] = await Promise.all([
    prisma.securityAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: (page - 1) * limit,
      select: {
        id: true, action: true, entityType: true, entityId: true,
        ipAddress: true, severity: true, createdAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.securityAuditLog.count({ where }),
  ]);

  return { logs, total, page, limit, totalPages: Math.ceil(total / limit) };
}

// ─── Suspicious Activity Detection ──────────────────────────

export async function detectSuspiciousLogin(userId: string, ip: string): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 3600_000);

  const failedAttempts = await prisma.securityAuditLog.count({
    where: {
      action: "user.login_failed",
      ipAddress: ip,
      createdAt: { gte: oneHourAgo },
    },
  });

  if (failedAttempts >= 5) {
    await logSuspiciousActivity(userId, "brute_force", ip, {
      failedAttempts,
      timeWindow: "1h",
    });
    return true;
  }

  // Check login from new IP
  const knownIps = await prisma.securityAuditLog.findMany({
    where: { userId, action: "user.login" },
    distinct: ["ipAddress"],
    select: { ipAddress: true },
    take: 50,
  });

  const isNewIp = !knownIps.some((k) => k.ipAddress === ip);
  if (isNewIp && knownIps.length > 0) {
    await logAudit({
      userId,
      action: "user.new_ip_login",
      ipAddress: ip,
      severity: "warning",
      metadata: { knownIpCount: knownIps.length },
    });
  }

  return false;
}

// ─── Archival (90 days) ─────────────────────────────────────

export async function archiveOldLogs(): Promise<{ archived: number }> {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400_000);

  // In production: move to cold storage (S3/R2) before deleting
  // For now: mark as archived by deleting old non-critical logs
  const result = await prisma.securityAuditLog.deleteMany({
    where: {
      createdAt: { lt: ninetyDaysAgo },
      severity: { in: ["info"] },
    },
  });

  // Keep warning/critical logs for 1 year
  const yearAgo = new Date(Date.now() - 365 * 86400_000);
  const criticalResult = await prisma.securityAuditLog.deleteMany({
    where: {
      createdAt: { lt: yearAgo },
    },
  });

  return { archived: result.count + criticalResult.count };
}
