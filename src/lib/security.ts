import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// ─── AUDIT LOG ───────────────────────────────────────────

export async function createAuditLog(data: {
  userId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string;
  userAgent?: string;
  severity?: string;
  metadata?: unknown;
}) {
  return prisma.securityAuditLog.create({
    data: {
      userId: data.userId,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      oldValue: data.oldValue ? JSON.parse(JSON.stringify(data.oldValue)) : undefined,
      newValue: data.newValue ? JSON.parse(JSON.stringify(data.newValue)) : undefined,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      severity: data.severity || "info",
      metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : undefined,
    },
  });
}

export async function getAuditLogs(filters: {
  userId?: string;
  action?: string;
  entityType?: string;
  severity?: string;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}) {
  const page = filters.page || 1;
  const limit = filters.limit || 50;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (filters.userId) where.userId = filters.userId;
  if (filters.action) where.action = { contains: filters.action };
  if (filters.entityType) where.entityType = filters.entityType;
  if (filters.severity) where.severity = filters.severity;
  if (filters.from || filters.to) {
    where.createdAt = {};
    if (filters.from) (where.createdAt as Record<string, unknown>).gte = filters.from;
    if (filters.to) (where.createdAt as Record<string, unknown>).lte = filters.to;
  }

  const [logs, total] = await Promise.all([
    prisma.securityAuditLog.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.securityAuditLog.count({ where }),
  ]);

  return { logs: JSON.parse(JSON.stringify(logs)), total, pages: Math.ceil(total / limit) };
}

export async function getAuditStats(userId?: string) {
  const where = userId ? { userId } : {};
  const [total, today, warnings, criticals] = await Promise.all([
    prisma.securityAuditLog.count({ where }),
    prisma.securityAuditLog.count({
      where: { ...where, createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    }),
    prisma.securityAuditLog.count({ where: { ...where, severity: "warning" } }),
    prisma.securityAuditLog.count({ where: { ...where, severity: "critical" } }),
  ]);
  return { total, today, warnings, criticals };
}

// ─── KVKK / DATA DELETION ───────────────────────────────

export async function createDeletionRequest(userId: string, data: { reason?: string; dataTypes: string[] }) {
  return prisma.dataDeletionRequest.create({
    data: {
      userId,
      reason: data.reason,
      dataTypes: data.dataTypes,
    },
  });
}

export async function getUserDeletionRequests(userId: string) {
  const requests = await prisma.dataDeletionRequest.findMany({
    where: { userId },
    orderBy: { requestedAt: "desc" },
  });
  return JSON.parse(JSON.stringify(requests));
}

export async function processDeletionRequest(requestId: string, approve: boolean) {
  if (approve) {
    return prisma.dataDeletionRequest.update({
      where: { id: requestId },
      data: { status: "ISLENIYOR", processedAt: new Date() },
    });
  }
  return prisma.dataDeletionRequest.update({
    where: { id: requestId },
    data: { status: "REDDEDILDI", processedAt: new Date() },
  });
}

// ─── 2FA ─────────────────────────────────────────────────

export function generateTOTPSecret(): string {
  return crypto.randomBytes(20).toString("hex");
}

export function generateBackupCodes(count = 8): string[] {
  return Array.from({ length: count }, () =>
    crypto.randomBytes(4).toString("hex").toUpperCase()
  );
}

export async function setup2FA(userId: string) {
  const secret = generateTOTPSecret();
  const backupCodes = generateBackupCodes();
  const hashedCodes = backupCodes.map((c) => crypto.createHash("sha256").update(c).digest("hex"));

  const tfa = await prisma.twoFactorAuth.upsert({
    where: { userId },
    create: { userId, secret, backupCodes: hashedCodes },
    update: { secret, backupCodes: hashedCodes, isEnabled: false, verifiedAt: null },
  });

  return { id: tfa.id, secret, backupCodes, qrUri: `otpauth://totp/IhalePro?secret=${secret}&issuer=IhalePro` };
}

export async function enable2FA(userId: string) {
  return prisma.twoFactorAuth.update({
    where: { userId },
    data: { isEnabled: true, verifiedAt: new Date() },
  });
}

export async function disable2FA(userId: string) {
  return prisma.twoFactorAuth.update({
    where: { userId },
    data: { isEnabled: false },
  });
}

export async function get2FAStatus(userId: string) {
  const tfa = await prisma.twoFactorAuth.findUnique({ where: { userId } });
  return tfa ? { isEnabled: tfa.isEnabled, verifiedAt: tfa.verifiedAt } : { isEnabled: false, verifiedAt: null };
}

// ─── IP WHITELIST ────────────────────────────────────────

export async function getIpWhitelist(companyId: string) {
  const list = await prisma.ipWhitelist.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
  });
  return JSON.parse(JSON.stringify(list));
}

export async function addIpWhitelist(companyId: string, ipRange: string, description?: string) {
  return prisma.ipWhitelist.create({
    data: { companyId, ipRange, description },
  });
}

export async function removeIpWhitelist(id: string) {
  return prisma.ipWhitelist.delete({ where: { id } });
}

// ─── ROLE PERMISSIONS ────────────────────────────────────

const DEFAULT_PERMISSIONS = [
  // ADMIN - full access
  { role: "ADMIN", resource: "tenders", action: "read", isAllowed: true },
  { role: "ADMIN", resource: "tenders", action: "create", isAllowed: true },
  { role: "ADMIN", resource: "tenders", action: "update", isAllowed: true },
  { role: "ADMIN", resource: "tenders", action: "delete", isAllowed: true },
  { role: "ADMIN", resource: "bids", action: "read", isAllowed: true },
  { role: "ADMIN", resource: "bids", action: "create", isAllowed: true },
  { role: "ADMIN", resource: "bids", action: "approve", isAllowed: true },
  { role: "ADMIN", resource: "contracts", action: "read", isAllowed: true },
  { role: "ADMIN", resource: "contracts", action: "create", isAllowed: true },
  { role: "ADMIN", resource: "reports", action: "read", isAllowed: true },
  { role: "ADMIN", resource: "settings", action: "read", isAllowed: true },
  { role: "ADMIN", resource: "settings", action: "update", isAllowed: true },
  // PREMIUM
  { role: "PREMIUM", resource: "tenders", action: "read", isAllowed: true },
  { role: "PREMIUM", resource: "bids", action: "read", isAllowed: true },
  { role: "PREMIUM", resource: "bids", action: "create", isAllowed: true },
  { role: "PREMIUM", resource: "contracts", action: "read", isAllowed: true },
  { role: "PREMIUM", resource: "reports", action: "read", isAllowed: true },
  { role: "PREMIUM", resource: "settings", action: "read", isAllowed: true },
  // USER
  { role: "USER", resource: "tenders", action: "read", isAllowed: true },
  { role: "USER", resource: "bids", action: "read", isAllowed: true },
  { role: "USER", resource: "bids", action: "create", isAllowed: true },
  { role: "USER", resource: "settings", action: "read", isAllowed: true },
  // VIEWER
  { role: "VIEWER", resource: "tenders", action: "read", isAllowed: true },
  { role: "VIEWER", resource: "bids", action: "read", isAllowed: true },
];

export async function getOrSeedPermissions() {
  const count = await prisma.rolePermission.count();
  if (count === 0) {
    await prisma.rolePermission.createMany({ data: DEFAULT_PERMISSIONS });
  }
  const permissions = await prisma.rolePermission.findMany({ orderBy: [{ role: "asc" }, { resource: "asc" }] });
  return JSON.parse(JSON.stringify(permissions));
}

export async function updatePermission(id: string, isAllowed: boolean) {
  return prisma.rolePermission.update({ where: { id }, data: { isAllowed } });
}

// ─── SESSION MANAGEMENT ──────────────────────────────────

export async function getUserSessions(userId: string) {
  const sessions = await prisma.userSession.findMany({
    where: { userId },
    orderBy: { lastSeenAt: "desc" },
  });
  return JSON.parse(JSON.stringify(sessions));
}

export async function createSession(userId: string, data: { ipAddress?: string; userAgent?: string; device?: string; location?: string }) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  return prisma.userSession.create({
    data: {
      userId,
      token,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      device: data.device,
      location: data.location,
      expiresAt,
    },
  });
}

export async function terminateSession(sessionId: string, userId: string) {
  return prisma.userSession.updateMany({
    where: { id: sessionId, userId },
    data: { isActive: false },
  });
}

export async function terminateAllSessions(userId: string, exceptSessionId?: string) {
  const where: Record<string, unknown> = { userId, isActive: true };
  if (exceptSessionId) where.id = { not: exceptSessionId };
  return prisma.userSession.updateMany({ where, data: { isActive: false } });
}

// ─── SECURITY SUMMARY ───────────────────────────────────

export async function getSecuritySummary(userId: string, companyId?: string | null) {
  const [tfa, sessions, auditStats, deletionRequests] = await Promise.all([
    get2FAStatus(userId),
    prisma.userSession.count({ where: { userId, isActive: true } }),
    getAuditStats(userId),
    prisma.dataDeletionRequest.count({ where: { userId, status: "TALEP_EDILDI" } }),
  ]);

  let ipWhitelistCount = 0;
  if (companyId) {
    ipWhitelistCount = await prisma.ipWhitelist.count({ where: { companyId, isActive: true } });
  }

  return {
    twoFactorEnabled: tfa.isEnabled,
    activeSessions: sessions,
    auditStats,
    pendingDeletionRequests: deletionRequests,
    ipWhitelistCount,
  };
}
