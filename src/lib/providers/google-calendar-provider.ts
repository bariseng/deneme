// ─── Google Calendar Provider ─────────────────────────────
// OAuth 2.0 + Google Calendar API v3
// Two-way sync with conflict resolution (server wins)

import { google, calendar_v3 } from "googleapis";
import { prisma } from "@/lib/prisma";
import { ProviderCache } from "./cache";

// ─── Types ──────────────────────────────────────────────────

export interface GoogleCalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  location?: string;
  status: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// ─── Config ─────────────────────────────────────────────────

const SCOPES = ["https://www.googleapis.com/auth/calendar"];
const CALENDAR_ID = "primary";
const cache = new ProviderCache();

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXTAUTH_URL}/api/calendar/auth/google/callback`,
  );
}

// ─── OAuth Flow ─────────────────────────────────────────────

export function getGoogleAuthUrl(state: string): string {
  const client = getOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
    state,
  });
}

export async function exchangeGoogleCode(code: string): Promise<TokenPair> {
  const client = getOAuth2Client();
  const { tokens } = await client.getToken(code);

  if (!tokens.access_token) {
    throw new Error("Google OAuth: access_token alınamadı");
  }

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || "",
  };
}

async function getAuthenticatedClient(userId: string): Promise<calendar_v3.Calendar> {
  const sync = await prisma.calendarSync.findUnique({
    where: { userId_provider: { userId, provider: "GOOGLE" } },
  });

  if (!sync?.accessToken) {
    throw new Error("Google Calendar bağlantısı bulunamadı. Lütfen yetkilendirin.");
  }

  const client = getOAuth2Client();
  client.setCredentials({
    access_token: sync.accessToken,
    refresh_token: sync.refreshToken || undefined,
  });

  // Handle token refresh
  client.on("tokens", async (tokens) => {
    if (tokens.access_token) {
      await prisma.calendarSync.update({
        where: { userId_provider: { userId, provider: "GOOGLE" } },
        data: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || sync.refreshToken,
        },
      });
    }
  });

  return google.calendar({ version: "v3", auth: client });
}

// ─── Event CRUD ─────────────────────────────────────────────

export async function pushEventToGoogle(
  userId: string,
  event: { title: string; description?: string; startDate: Date; endDate?: Date; location?: string },
): Promise<string> {
  const cal = await getAuthenticatedClient(userId);

  const res = await cal.events.insert({
    calendarId: CALENDAR_ID,
    requestBody: {
      summary: event.title,
      description: event.description,
      location: event.location,
      start: { dateTime: event.startDate.toISOString(), timeZone: "Europe/Istanbul" },
      end: { dateTime: (event.endDate || event.startDate).toISOString(), timeZone: "Europe/Istanbul" },
      reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 60 }] },
    },
  });

  return res.data.id || "";
}

export async function updateGoogleEvent(
  userId: string,
  externalId: string,
  event: { title?: string; description?: string; startDate?: Date; endDate?: Date },
): Promise<void> {
  const cal = await getAuthenticatedClient(userId);

  const body: calendar_v3.Schema$Event = {};
  if (event.title) body.summary = event.title;
  if (event.description) body.description = event.description;
  if (event.startDate) body.start = { dateTime: event.startDate.toISOString(), timeZone: "Europe/Istanbul" };
  if (event.endDate) body.end = { dateTime: event.endDate.toISOString(), timeZone: "Europe/Istanbul" };

  await cal.events.patch({ calendarId: CALENDAR_ID, eventId: externalId, requestBody: body });
}

export async function deleteGoogleEvent(userId: string, externalId: string): Promise<void> {
  const cal = await getAuthenticatedClient(userId);
  await cal.events.delete({ calendarId: CALENDAR_ID, eventId: externalId });
}

// ─── Two-Way Sync ───────────────────────────────────────────

export async function syncWithGoogle(userId: string): Promise<{
  pushed: number;
  pulled: number;
  conflicts: number;
}> {
  const cal = await getAuthenticatedClient(userId);
  let pushed = 0;
  let pulled = 0;
  let conflicts = 0;

  // 1. Push local events → Google
  const localEvents = await prisma.calendarEvent.findMany({
    where: { userId, startDate: { gte: new Date() } },
  });

  for (const evt of localEvents) {
    if (evt.externalId) {
      // Update existing
      try {
        await updateGoogleEvent(userId, evt.externalId, {
          title: evt.title,
          description: evt.description || undefined,
          startDate: evt.startDate,
          endDate: evt.endDate || undefined,
        });
        pushed++;
      } catch {
        conflicts++;
      }
    } else {
      // Create new
      const externalId = await pushEventToGoogle(userId, {
        title: evt.title,
        description: evt.description || undefined,
        startDate: evt.startDate,
        endDate: evt.endDate || undefined,
      });
      await prisma.calendarEvent.update({
        where: { id: evt.id },
        data: { externalId },
      });
      pushed++;
    }
  }

  // 2. Pull Google events → local (server wins on conflict)
  const now = new Date();
  const threeMonthsLater = new Date(now);
  threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

  const googleEvents = await cal.events.list({
    calendarId: CALENDAR_ID,
    timeMin: now.toISOString(),
    timeMax: threeMonthsLater.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 250,
  });

  const items = googleEvents.data.items || [];
  const existingExternalIds = new Set(localEvents.map((e) => e.externalId).filter(Boolean));

  for (const item of items) {
    if (!item.id || existingExternalIds.has(item.id)) continue;
    // Skip İhalePro-pushed events (already in local)
    if (item.description?.includes("[İhalePro]")) continue;

    const startDate = item.start?.dateTime || item.start?.date;
    if (!startDate) continue;

    await prisma.calendarEvent.create({
      data: {
        userId,
        title: item.summary || "Google Etkinlik",
        description: item.description || null,
        eventType: "OZEL",
        startDate: new Date(startDate),
        endDate: item.end?.dateTime ? new Date(item.end.dateTime) : null,
        externalId: item.id,
        isAutoGenerated: false,
        reminderDays: [],
      },
    });
    pulled++;
  }

  // Update sync timestamp
  await prisma.calendarSync.update({
    where: { userId_provider: { userId, provider: "GOOGLE" } },
    data: { lastSyncAt: new Date() },
  });

  return { pushed, pulled, conflicts };
}

// ─── Health Check ───────────────────────────────────────────

export async function googleCalendarHealthCheck(userId: string): Promise<boolean> {
  try {
    const cal = await getAuthenticatedClient(userId);
    await cal.calendarList.list({ maxResults: 1 });
    return true;
  } catch {
    return false;
  }
}
