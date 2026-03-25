import { prisma } from "@/lib/prisma";

export interface EKAPSyncResult {
  totalFetched: number;
  newRecords: number;
  updatedRecords: number;
  errors: number;
  syncedAt: string;
}

export async function syncFromEKAP(): Promise<EKAPSyncResult> {
  const log = await prisma.ekapSyncLog.create({
    data: { status: "running" },
  });

  try {
    // Gerçek EKAP API entegrasyonu burada olacak
    // Şimdilik simülasyon
    const fetched = 10 + Math.floor(Math.random() * 30);
    const newRecords = Math.floor(fetched * 0.3);
    const updated = Math.floor(fetched * 0.2);

    await prisma.ekapSyncLog.update({
      where: { id: log.id },
      data: {
        finishedAt: new Date(),
        totalFetched: fetched,
        newRecords,
        updatedRecords: updated,
        status: "completed",
      },
    });

    return {
      totalFetched: fetched,
      newRecords,
      updatedRecords: updated,
      errors: 0,
      syncedAt: new Date().toISOString(),
    };
  } catch (error) {
    await prisma.ekapSyncLog.update({
      where: { id: log.id },
      data: {
        finishedAt: new Date(),
        status: "failed",
        errors: 1,
        errorDetails: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
    });
    throw error;
  }
}

export async function getLastSyncStatus() {
  return prisma.ekapSyncLog.findFirst({
    orderBy: { startedAt: "desc" },
  });
}
