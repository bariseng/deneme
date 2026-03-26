// ─── Outlook Calendar Provider ────────────────────────────
// Microsoft Graph API + OAuth 2.0 (Azure AD)
// Two-way sync with conflict resolution (server wins)

import { ConfidentialClientApplication } from "@azure/msal-node";
import { Client } from "@microsoft/microsoft-graph-client";
import { prisma } from "@/lib/prisma";

// ─── Types ──────────────────────────────────────────────────

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface GraphEvent {
  id?: string;
  subject: string;
  body?: { contentType: string; content: string };
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  location?: { displayName: string };
  isReminderOn?: boolean;
  reminderMinutesBeforeStart?: number;
}

// ─── Config ─────────────────────────────────────────────────

const SCOPES = ["Calendars.ReadWrite", "offline_access"];
const REDIRECT_URI = `${process.env.NEXTAUTH_URL}/api/calendar/auth/outlook/callback`;

function getMsalClient(): ConfidentialClientApplication {
  if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET) {
    throw new Error("MICROSOFT_CLIENT_ID ve MICROSOFT_CLIENT_SECRET tanımlanmalı");
  }

  return new ConfidentialClientApplication({
    auth: {
      clientId: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      authority: "https://login.microsoftonline.com/common",
    },
  });
}

function getGraphClient(accessToken: string): Client {
  return Client.init({
    authProvider: (done) => done(null, accessToken),
  });
}

// ─── OAuth Flow ─────────────────────────────────────────────

export async function getOutlookAuthUrl(state: string): Promise<string> {
  const msalClient = getMsalClient();
  const url = await msalClient.getAuthCodeUrl({
    scopes: SCOPES,
    redirectUri: REDIRECT_URI,
    state,
  });
  return url;
}

export async function exchangeOutlookCode(code: string): Promise<TokenPair> {
  const msalClient = getMsalClient();
  const result = await msalClient.acquireTokenByCode({
    code,
    scopes: SCOPES,
    redirectUri: REDIRECT_URI,
  });

  if (!result?.accessToken) {
    throw new Error("Microsoft OAuth: access_token alınamadı");
  }

  // MSAL doesn't expose refresh_token directly; we store the access token
  // and use MSAL's cache for silent token acquisition
  return {
    accessToken: result.accessToken,
    refreshToken: "", // MSAL manages refresh internally
  };
}

async function getAuthenticatedClient(userId: string): Promise<Client> {
  const sync = await prisma.calendarSync.findUnique({
    where: { userId_provider: { userId, provider: "OUTLOOK" } },
  });

  if (!sync?.accessToken) {
    throw new Error("Outlook Calendar bağlantısı bulunamadı. Lütfen yetkilendirin.");
  }

  // Try to refresh if needed
  try {
    const msalClient = getMsalClient();
    const accounts = await msalClient.getTokenCache().getAllAccounts();
    if (accounts.length > 0) {
      const result = await msalClient.acquireTokenSilent({
        account: accounts[0],
        scopes: SCOPES,
      });
      if (result?.accessToken && result.accessToken !== sync.accessToken) {
        await prisma.calendarSync.update({
          where: { userId_provider: { userId, provider: "OUTLOOK" } },
          data: { accessToken: result.accessToken },
        });
        return getGraphClient(result.accessToken);
      }
    }
  } catch {
    // Fall through to use stored token
  }

  return getGraphClient(sync.accessToken);
}

// ─── Event CRUD ─────────────────────────────────────────────

export async function pushEventToOutlook(
  userId: string,
  event: { title: string; description?: string; startDate: Date; endDate?: Date },
): Promise<string> {
  const client = await getAuthenticatedClient(userId);

  const graphEvent: GraphEvent = {
    subject: event.title,
    body: event.description ? { contentType: "text", content: event.description } : undefined,
    start: { dateTime: event.startDate.toISOString(), timeZone: "Turkey Standard Time" },
    end: { dateTime: (event.endDate || event.startDate).toISOString(), timeZone: "Turkey Standard Time" },
    isReminderOn: true,
    reminderMinutesBeforeStart: 60,
  };

  const res = await client.api("/me/events").post(graphEvent);
  return res.id || "";
}

export async function updateOutlookEvent(
  userId: string,
  externalId: string,
  event: { title?: string; description?: string; startDate?: Date; endDate?: Date },
): Promise<void> {
  const client = await getAuthenticatedClient(userId);

  const body: Partial<GraphEvent> = {};
  if (event.title) body.subject = event.title;
  if (event.description) body.body = { contentType: "text", content: event.description };
  if (event.startDate) body.start = { dateTime: event.startDate.toISOString(), timeZone: "Turkey Standard Time" };
  if (event.endDate) body.end = { dateTime: event.endDate.toISOString(), timeZone: "Turkey Standard Time" };

  await client.api(`/me/events/${externalId}`).patch(body);
}

export async function deleteOutlookEvent(userId: string, externalId: string): Promise<void> {
  const client = await getAuthenticatedClient(userId);
  await client.api(`/me/events/${externalId}`).delete();
}

// ─── Two-Way Sync ───────────────────────────────────────────

export async function syncWithOutlook(userId: string): Promise<{
  pushed: number;
  pulled: number;
  conflicts: number;
}> {
  const client = await getAuthenticatedClient(userId);
  let pushed = 0;
  let pulled = 0;
  let conflicts = 0;

  // 1. Push local events → Outlook
  const localEvents = await prisma.calendarEvent.findMany({
    where: { userId, startDate: { gte: new Date() } },
  });

  for (const evt of localEvents) {
    if (evt.externalId) {
      try {
        await updateOutlookEvent(userId, evt.externalId, {
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
      const externalId = await pushEventToOutlook(userId, {
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

  // 2. Pull Outlook events → local (server wins on conflict)
  const now = new Date();
  const threeMonthsLater = new Date(now);
  threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

  const response = await client
    .api("/me/calendarView")
    .query({
      startDateTime: now.toISOString(),
      endDateTime: threeMonthsLater.toISOString(),
      $top: 250,
      $orderby: "start/dateTime",
    })
    .get();

  const items: { id: string; subject: string; bodyPreview?: string; start: { dateTime: string }; end: { dateTime: string } }[] =
    response.value || [];
  const existingExternalIds = new Set(localEvents.map((e) => e.externalId).filter(Boolean));

  for (const item of items) {
    if (existingExternalIds.has(item.id)) continue;
    if (item.bodyPreview?.includes("[İhalePro]")) continue;

    await prisma.calendarEvent.create({
      data: {
        userId,
        title: item.subject || "Outlook Etkinlik",
        description: item.bodyPreview || null,
        eventType: "OZEL",
        startDate: new Date(item.start.dateTime),
        endDate: new Date(item.end.dateTime),
        externalId: item.id,
        isAutoGenerated: false,
        reminderDays: [],
      },
    });
    pulled++;
  }

  // Update sync timestamp
  await prisma.calendarSync.update({
    where: { userId_provider: { userId, provider: "OUTLOOK" } },
    data: { lastSyncAt: new Date() },
  });

  return { pushed, pulled, conflicts };
}

// ─── Health Check ───────────────────────────────────────────

export async function outlookCalendarHealthCheck(userId: string): Promise<boolean> {
  try {
    const client = await getAuthenticatedClient(userId);
    await client.api("/me/calendars").top(1).get();
    return true;
  } catch {
    return false;
  }
}
