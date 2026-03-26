// ─── Calendar Export Service ──────────────────────────────
// ICS file generation with ical-generator
// User-specific token-based ICS feed URL

import { randomBytes } from "crypto";
import ical, { ICalCalendarMethod, ICalAlarmType } from "ical-generator";
import { prisma } from "@/lib/prisma";
import { EVENT_TYPE_CONFIG } from "@/lib/calendar-engine";

// ─── Types ──────────────────────────────────────────────────

export interface IcsExportOptions {
  from?: Date;
  to?: Date;
  eventTypes?: string[];
  includeReminders?: boolean;
}

// ─── ICS Generation ─────────────────────────────────────────

export async function generateIcs(userId: string, options: IcsExportOptions = {}): Promise<string> {
  const where: Record<string, unknown> = { userId };

  if (options.from || options.to) {
    where.startDate = {};
    if (options.from) (where.startDate as Record<string, unknown>).gte = options.from;
    if (options.to) (where.startDate as Record<string, unknown>).lte = options.to;
  } else {
    // Default: future events only
    where.startDate = { gte: new Date() };
  }

  if (options.eventTypes?.length) {
    where.eventType = { in: options.eventTypes };
  }

  const events = await prisma.calendarEvent.findMany({
    where,
    include: {
      tender: { select: { id: true, title: true, institution: true, city: true } },
    },
    orderBy: { startDate: "asc" },
  });

  const calendar = ical({
    name: "İhalePro Takvim",
    prodId: { company: "İhalePro", product: "Calendar" },
    method: ICalCalendarMethod.PUBLISH,
    timezone: "Europe/Istanbul",
  });

  for (const evt of events) {
    const config = EVENT_TYPE_CONFIG[evt.eventType] || EVENT_TYPE_CONFIG.OZEL;
    const description = buildDescription(evt);

    const calEvent = calendar.createEvent({
      id: evt.id,
      start: evt.startDate,
      end: evt.endDate || evt.startDate,
      summary: evt.title,
      description,
      location: evt.tender?.city || undefined,
      categories: [{ name: config.label }],
      url: evt.tenderId ? `${process.env.NEXTAUTH_URL}/ihaleler/${evt.tenderId}` : undefined,
    });

    // Add reminders
    if (options.includeReminders !== false && evt.reminderDays.length > 0) {
      for (const days of evt.reminderDays) {
        calEvent.createAlarm({
          type: ICalAlarmType.display,
          trigger: days * 24 * 60 * 60, // seconds before
          description: `${evt.title} - ${days} gün kaldı`,
        });
      }
    }
  }

  return calendar.toString();
}

function buildDescription(evt: {
  description?: string | null;
  eventType: string;
  tender?: { title: string; institution: string; city: string } | null;
}): string {
  const parts: string[] = [];

  if (evt.tender) {
    parts.push(`İhale: ${evt.tender.title}`);
    parts.push(`Kurum: ${evt.tender.institution}`);
    parts.push(`İl: ${evt.tender.city}`);
  }

  if (evt.description) parts.push(evt.description);
  parts.push(`\n[İhalePro] Tür: ${EVENT_TYPE_CONFIG[evt.eventType]?.label || evt.eventType}`);

  return parts.join("\n");
}

// ─── Token-Based Feed ───────────────────────────────────────

export async function getOrCreateFeedToken(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!user) throw new Error("Kullanıcı bulunamadı");

  // Check if token exists in CalendarSync with a special "ICS" entry
  // We store the feed token in a dedicated CalendarSync row
  const existing = await prisma.calendarSync.findFirst({
    where: { userId, provider: "GOOGLE", accessToken: { startsWith: "ics_feed:" } },
  });

  if (existing?.accessToken) {
    return existing.accessToken.replace("ics_feed:", "");
  }

  // Generate a new secure token
  const token = randomBytes(32).toString("hex");

  // Store it — we reuse CalendarSync but could also use a dedicated model
  // Use upsert with a convention: accessToken starts with "ics_feed:"
  await prisma.calendarSync.upsert({
    where: { userId_provider: { userId, provider: "GOOGLE" } },
    create: {
      userId,
      provider: "GOOGLE",
      accessToken: `ics_feed:${token}`,
      syncEnabled: false,
    },
    update: {}, // Don't overwrite existing Google sync
  });

  // If Google sync already exists, store in a cache key
  const { ProviderCache } = await import("@/lib/providers/cache");
  const cache = new ProviderCache();
  await cache.set(`ics_feed:${userId}`, token, { ttl: 86400 * 365, staleWhileRevalidate: false, key: "ics" }, "ICS");

  return token;
}

export async function validateFeedToken(token: string): Promise<string | null> {
  // Search for user with this feed token
  const sync = await prisma.calendarSync.findFirst({
    where: { accessToken: `ics_feed:${token}` },
    select: { userId: true },
  });

  if (sync) return sync.userId;

  // Check cache fallback
  const { ProviderCache } = await import("@/lib/providers/cache");
  const cache = new ProviderCache();

  // We need to search through cached data - find by token value
  const allSyncs = await prisma.calendarSync.findMany({
    where: { provider: "GOOGLE" },
    select: { userId: true },
  });

  for (const s of allSyncs) {
    const cached = await cache.get<string>(`ics_feed:${s.userId}`);
    if (cached === token) return s.userId;
  }

  return null;
}

export function getFeedUrl(token: string): string {
  return `${process.env.NEXTAUTH_URL}/api/calendar/ics?token=${token}`;
}
