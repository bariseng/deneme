// ─── EKAP Hatırlatma Botu ────────────────────────────────────
// Zarf açılış tarihi hatırlatması, iptal/erteleme bildirimi,
// sonuç açıklama bildirimi

import { prisma } from "@/lib/prisma";
import { ekapProvider } from "@/lib/providers/ekap-provider";
import { ProviderCache } from "@/lib/providers/cache";

const cache = new ProviderCache();

// ─── Types ──────────────────────────────────────────────────

interface ReminderResult {
  openingReminders: number;
  cancellationAlerts: number;
  resultAlerts: number;
  errors: string[];
}

// ─── Opening Date Reminders ─────────────────────────────────

async function sendOpeningReminders(): Promise<number> {
  const now = new Date();
  const in48h = new Date(now.getTime() + 48 * 3600_000);

  // Find EKAP tenders with opening dates in next 48 hours
  const tenders = await prisma.tender.findMany({
    where: {
      source: "EKAP",
      openingDate: { gte: now, lte: in48h },
      status: "BASVURU_ACIK",
    },
    select: {
      id: true,
      title: true,
      institution: true,
      openingDate: true,
      favorites: { select: { userId: true } },
      bids: { select: { userId: true } },
    },
  });

  let count = 0;
  for (const tender of tenders) {
    const userIds = new Set([
      ...tender.favorites.map((f) => f.userId),
      ...tender.bids.map((b) => b.userId),
    ]);

    const hoursLeft = tender.openingDate
      ? Math.round((tender.openingDate.getTime() - now.getTime()) / 3600_000)
      : 0;

    for (const userId of userIds) {
      const notifKey = `ekap_open_remind:${tender.id}:${userId}`;
      const existing = await cache.get(notifKey);
      if (existing) continue;

      await prisma.notification.create({
        data: {
          userId,
          type: "SON_BASVURU",
          title: `Zarf Açılışı: ${hoursLeft} saat kaldı`,
          message: `"${tender.title}" ihalesi zarf açılışı yaklaşıyor. Kurum: ${tender.institution}`,
          link: `/ihaleler/${tender.id}`,
          tenderId: tender.id,
        },
      });

      await cache.set(notifKey, true, { ttl: 172800, staleWhileRevalidate: false, key: "erem" }, "EKAP");
      count++;
    }
  }

  return count;
}

// ─── Cancellation / Postponement Alerts ─────────────────────

async function checkCancellations(): Promise<number> {
  // Find recently active tenders that might have been cancelled
  const trackedTenders = await prisma.tender.findMany({
    where: {
      source: "EKAP",
      status: { in: ["BASVURU_ACIK", "DEGERLENDIRME"] },
      ekapNo: { not: null },
    },
    select: {
      id: true,
      title: true,
      institution: true,
      ekapNo: true,
      openingDate: true,
      deadline: true,
      favorites: { select: { userId: true } },
      bids: { select: { userId: true } },
    },
    take: 100,
  });

  let count = 0;
  for (const tender of trackedTenders) {
    if (!tender.ekapNo) continue;

    try {
      const ihaleId = parseInt(tender.ekapNo);
      const detail = await ekapProvider.getTenderDetail(ihaleId);
      if (!detail) continue;

      // ihaleDurumId: 4 = IPTAL
      const isCancelled = detail.ihaleDurumId === 4;
      // Detect date change (postponement)
      const newDeadline = new Date(detail.ihaleTarihSaat ?? detail.ihaleTarihi ?? Date.now());
      const isPostponed = tender.deadline && Math.abs(newDeadline.getTime() - tender.deadline.getTime()) > 3600_000;

      if (!isCancelled && !isPostponed) continue;

      const userIds = new Set([
        ...tender.favorites.map((f) => f.userId),
        ...tender.bids.map((b) => b.userId),
      ]);

      if (isCancelled) {
        await prisma.tender.update({
          where: { id: tender.id },
          data: { status: "IPTAL" },
        });

        for (const userId of userIds) {
          await prisma.notification.create({
            data: {
              userId,
              type: "SISTEM",
              title: "İhale İptal Edildi",
              message: `"${tender.title}" ihalesi iptal edilmiştir. Kurum: ${tender.institution}`,
              link: `/ihaleler/${tender.id}`,
              tenderId: tender.id,
            },
          });
          count++;
        }
      }

      if (isPostponed && !isCancelled) {
        await prisma.tender.update({
          where: { id: tender.id },
          data: { deadline: newDeadline },
        });

        for (const userId of userIds) {
          await prisma.notification.create({
            data: {
              userId,
              type: "ZEYILNAME",
              title: "İhale Tarihi Değişti",
              message: `"${tender.title}" ihalesi ertelenmiştir. Yeni tarih: ${newDeadline.toLocaleDateString("tr-TR")}`,
              link: `/ihaleler/${tender.id}`,
              tenderId: tender.id,
            },
          });
          count++;
        }
      }
    } catch {
      // Skip individual failures
    }
  }

  return count;
}

// ─── Result Announcement Alerts ─────────────────────────────

async function checkResultAnnouncements(): Promise<number> {
  const pendingTenders = await prisma.tender.findMany({
    where: {
      source: "EKAP",
      status: "DEGERLENDIRME",
      ekapNo: { not: null },
    },
    select: {
      id: true,
      title: true,
      institution: true,
      ekapNo: true,
      favorites: { select: { userId: true } },
      bids: { select: { userId: true } },
    },
    take: 100,
  });

  let count = 0;
  for (const tender of pendingTenders) {
    if (!tender.ekapNo) continue;

    try {
      const ihaleId = parseInt(tender.ekapNo);
      const detail = await ekapProvider.getTenderDetail(ihaleId);
      if (!detail || detail.ihaleDurumId !== 3) continue; // 3 = SONUCLANDI

      await prisma.tender.update({
        where: { id: tender.id },
        data: { status: "SONUCLANDI" },
      });

      const raw = detail as unknown as Record<string, unknown>;
      const winnerName = (raw.kazananFirma as string) || "Belirtilmedi";

      const userIds = new Set([
        ...tender.favorites.map((f) => f.userId),
        ...tender.bids.map((b) => b.userId),
      ]);

      for (const userId of userIds) {
        await prisma.notification.create({
          data: {
            userId,
            type: "SONUC",
            title: "İhale Sonuçlandı",
            message: `"${tender.title}" ihalesi sonuçlandı. Kazanan: ${winnerName}`,
            link: `/ihaleler/${tender.id}`,
            tenderId: tender.id,
          },
        });
        count++;
      }
    } catch {
      // Skip individual failures
    }
  }

  return count;
}

// ─── Main Bot Runner ────────────────────────────────────────

export async function runEkapReminderBot(): Promise<ReminderResult> {
  const errors: string[] = [];
  let openingReminders = 0;
  let cancellationAlerts = 0;
  let resultAlerts = 0;

  try {
    openingReminders = await sendOpeningReminders();
  } catch (e) {
    errors.push(`Opening reminders: ${e instanceof Error ? e.message : "Hata"}`);
  }

  try {
    cancellationAlerts = await checkCancellations();
  } catch (e) {
    errors.push(`Cancellation check: ${e instanceof Error ? e.message : "Hata"}`);
  }

  try {
    resultAlerts = await checkResultAnnouncements();
  } catch (e) {
    errors.push(`Result check: ${e instanceof Error ? e.message : "Hata"}`);
  }

  return { openingReminders, cancellationAlerts, resultAlerts, errors };
}
