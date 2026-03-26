// ─── Inngest Background Job Functions ────────────────────────
// EKAP sync, TED sync, price index update, batch notifications

import { inngest } from "./client";

// ─── EKAP Tender Sync ───────────────────────────────────────

export const syncEkap = inngest.createFunction(
  {
    id: "sync-ekap-tenders",
    name: "EKAP Tender Sync",
    retries: 3,
    concurrency: { limit: 1 },
    triggers: [{ cron: "0 */2 * * *" }], // Every 2 hours
  },
  async ({ step }) => {
    const result = await step.run("fetch-and-upsert", async () => {
      const { ekapProvider } = await import("@/lib/providers/ekap-provider");
      const data = await ekapProvider.searchTenders({ sayfaBoyutu: 100 });
      if (data.list.length > 0) {
        await ekapProvider.batchUpsert(data.list);
      }
      return { fetched: data.list.length, total: data.totalCount };
    });

    await step.run("scan-results", async () => {
      const { scanForNewResults } = await import("@/lib/services/ekap-deep");
      return scanForNewResults(50);
    });

    return result;
  },
);

// ─── TED International Tender Sync ──────────────────────────

export const syncTed = inngest.createFunction(
  {
    id: "sync-ted-tenders",
    name: "TED Tender Sync",
    retries: 3,
    concurrency: { limit: 1 },
    triggers: [{ cron: "30 */3 * * *" }], // Every 3 hours at :30
  },
  async ({ step }) => {
    const result = await step.run("fetch-ted-tenders", async () => {
      const { tedProvider } = await import("@/lib/providers/ted-provider");
      const countries = ["TR", "DE", "FR", "IT", "ES"];
      let total = 0;

      for (const country of countries) {
        try {
          const data = await tedProvider.searchNotices({
            country,
            pageSize: 50,
          });
          total += data.notices.length;
        } catch {
          // Continue with other countries
        }
      }

      return { countries: countries.length, fetched: total };
    });

    return result;
  },
);

// ─── Price Index Update ─────────────────────────────────────

export const updatePriceIndex = inngest.createFunction(
  {
    id: "update-price-index",
    name: "Price Index Update",
    retries: 2,
    concurrency: { limit: 1 },
    triggers: [{ cron: "0 6 * * 1" }], // Every Monday at 06:00
  },
  async ({ step }) => {
    const result = await step.run("fetch-price-data", async () => {
      const { prisma } = await import("@/lib/prisma");
      const count = await prisma.unitPriceIndex.count();
      return { existingRecords: count };
    });

    return result;
  },
);

// ─── EKAP Reminder Bot ─────────────────────────────────────

export const ekapReminder = inngest.createFunction(
  {
    id: "ekap-reminder-bot",
    name: "EKAP Reminder Bot",
    retries: 2,
    concurrency: { limit: 1 },
    triggers: [{ cron: "0 8,12,16 * * *" }], // 08:00, 12:00, 16:00
  },
  async ({ step }) => {
    const result = await step.run("run-reminders", async () => {
      const { runEkapReminderBot } = await import("@/lib/services/ekap-reminder");
      return runEkapReminderBot();
    });

    return result;
  },
);

// ─── Batch Email/SMS Sending ────────────────────────────────

export const sendBatchNotifications = inngest.createFunction(
  {
    id: "send-batch-notifications",
    name: "Batch Notification Sender",
    retries: 3,
    concurrency: { limit: 2 },
    triggers: [{ event: "notifications/batch.send" }],
  },
  async ({ event, step }) => {
    const { userIds, title, message } = event.data as {
      userIds: string[];
      title: string;
      message: string;
    };

    const BATCH_SIZE = 50;
    const batches: string[][] = [];
    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
      batches.push(userIds.slice(i, i + BATCH_SIZE));
    }

    let sent = 0;
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      sent += await step.run(`send-batch-${i}`, async () => {
        const { prisma } = await import("@/lib/prisma");
        await prisma.notification.createMany({
          data: batch.map((userId) => ({
            userId,
            type: "SISTEM" as const,
            title,
            message,
          })),
        });
        return batch.length;
      });
    }

    return { totalSent: sent, batches: batches.length };
  },
);

// ─── Cache Cleanup ──────────────────────────────────────────

export const cleanupCache = inngest.createFunction(
  {
    id: "cleanup-cache",
    name: "Cache Cleanup",
    retries: 1,
    triggers: [{ cron: "0 3 * * *" }], // Daily at 03:00
  },
  async ({ step }) => {
    const result = await step.run("cleanup-expired", async () => {
      const { ProviderCache } = await import("@/lib/providers/cache");
      const cache = new ProviderCache();
      const cleaned = await cache.cleanup();
      return { cleanedEntries: cleaned };
    });

    await step.run("archive-audit-logs", async () => {
      const { archiveOldLogs } = await import("@/lib/security/audit-log");
      return archiveOldLogs();
    });

    return result;
  },
);

// Export all functions for the Inngest serve handler
export const functions = [
  syncEkap,
  syncTed,
  updatePriceIndex,
  ekapReminder,
  sendBatchNotifications,
  cleanupCache,
];
