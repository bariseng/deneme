// ─── KVKK Privacy Service ───────────────────────────────────
// Açık rıza, veri silme, veri taşınabilirliği (6698 sayılı kanun)

import { prisma } from "@/lib/prisma";
import { logDataDeletion } from "@/lib/security/audit-log";

// ─── Types ──────────────────────────────────────────────────

interface ConsentRecord {
  type: string;
  version: string;
  accepted: boolean;
  acceptedAt: Date | null;
}

interface DataPortabilityExport {
  user: {
    email: string;
    name: string | null;
    phone: string | null;
    createdAt: Date;
  };
  bids: { tenderId: string; totalAmount: string | null; status: string; createdAt: Date }[];
  favorites: { tenderId: string; createdAt: Date }[];
  applications: { tenderId: string; status: string; createdAt: Date }[];
  contracts: { title: string; totalAmount: string; createdAt: Date }[];
  notifications: { type: string; message: string; createdAt: Date }[];
}

interface DeletionResult {
  requestId: string;
  status: string;
  deletedData: string[];
  remainingDays: number;
}

// ─── Data Types ─────────────────────────────────────────────

export const DATA_TYPES = [
  { id: "profil", label: "Profil bilgileri", description: "İsim, e-posta, telefon" },
  { id: "teklifler", label: "Teklif verileri", description: "Tüm teklif kayıtları" },
  { id: "favori", label: "Favoriler", description: "Takip edilen ihaleler" },
  { id: "basvuru", label: "Başvurular", description: "İhale başvuruları" },
  { id: "bildirim", label: "Bildirimler", description: "Bildirim geçmişi" },
  { id: "arama", label: "Arama geçmişi", description: "Arama sorguları" },
  { id: "sozlesme", label: "Sözleşmeler", description: "Sözleşme kayıtları" },
  { id: "mesaj", label: "Mesajlar", description: "Forum mesajları ve yorumlar" },
];

// ─── Consent Management ─────────────────────────────────────

const CONSENT_TYPES = [
  { type: "aydinlatma_metni", version: "1.0", label: "Aydınlatma Metni" },
  { type: "acik_riza", version: "1.0", label: "Kişisel Veri İşleme Açık Rızası" },
  { type: "pazarlama", version: "1.0", label: "Pazarlama İletişimi" },
  { type: "ucuncu_taraf", version: "1.0", label: "Üçüncü Taraf Paylaşım" },
];

export async function getConsentStatus(userId: string): Promise<ConsentRecord[]> {
  // Store consent in CachedData model as lightweight record
  const records: ConsentRecord[] = [];

  for (const ct of CONSENT_TYPES) {
    const key = `consent:${userId}:${ct.type}`;
    const existing = await prisma.cachedData.findUnique({ where: { key } });
    const data = existing?.value as Record<string, unknown> | null;

    records.push({
      type: ct.type,
      version: ct.version,
      accepted: data?.accepted === true,
      acceptedAt: data?.acceptedAt ? new Date(data.acceptedAt as string) : null,
    });
  }

  return records;
}

export async function recordConsent(
  userId: string,
  consentType: string,
  accepted: boolean,
  ip: string,
): Promise<void> {
  const validType = CONSENT_TYPES.find((ct) => ct.type === consentType);
  if (!validType) throw new Error("Geçersiz rıza tipi");

  const key = `consent:${userId}:${consentType}`;
  const value = JSON.parse(JSON.stringify({
    accepted,
    acceptedAt: accepted ? new Date().toISOString() : null,
    version: validType.version,
    ip,
    recordedAt: new Date().toISOString(),
  }));

  await prisma.cachedData.upsert({
    where: { key },
    create: {
      key,
      value,
      provider: "KVKK",
      ttl: 365 * 24 * 60 * 60, // 1 year
      expiresAt: new Date(Date.now() + 365 * 86400_000),
    },
    update: { value },
  });
}

// ─── Data Portability ───────────────────────────────────────

export async function exportUserData(userId: string): Promise<DataPortabilityExport> {
  const [user, bids, favorites, applications, contracts, notifications] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true, phone: true, createdAt: true },
    }),

    prisma.bid.findMany({
      where: { userId },
      select: { tenderId: true, totalAmount: true, status: true, createdAt: true },
    }),

    prisma.favorite.findMany({
      where: { userId },
      select: { tenderId: true, createdAt: true },
    }),

    prisma.application.findMany({
      where: { userId },
      select: { tenderId: true, status: true, createdAt: true },
    }),

    prisma.contract.findMany({
      where: { userId },
      select: { title: true, totalAmount: true, createdAt: true },
    }),

    prisma.notification.findMany({
      where: { userId },
      select: { type: true, message: true, createdAt: true },
      take: 1000,
    }),
  ]);

  if (!user) throw new Error("Kullanıcı bulunamadı");

  return {
    user,
    bids: bids.map((b) => ({
      ...b,
      totalAmount: b.totalAmount?.toString() || null,
    })),
    favorites,
    applications,
    contracts: contracts.map((c) => ({
      ...c,
      totalAmount: c.totalAmount.toString(),
    })),
    notifications,
  };
}

// ─── Right to Erasure (Veri Silme) ──────────────────────────

export async function requestDataDeletion(
  userId: string,
  dataTypes: string[],
  reason: string,
  ip: string,
): Promise<DeletionResult> {
  // Validate data types
  const validTypes = dataTypes.filter((dt) => DATA_TYPES.some((d) => d.id === dt));
  if (validTypes.length === 0) throw new Error("En az bir veri türü seçilmelidir");

  const request = await prisma.dataDeletionRequest.create({
    data: {
      userId,
      dataTypes: validTypes,
      reason,
      status: "TALEP_EDILDI",
    },
  });

  await logDataDeletion(userId, validTypes, ip);

  return {
    requestId: request.id,
    status: "TALEP_EDILDI",
    deletedData: [],
    remainingDays: 30, // KVKK 30-day deadline
  };
}

export async function processDataDeletion(requestId: string): Promise<DeletionResult> {
  const request = await prisma.dataDeletionRequest.findUnique({
    where: { id: requestId },
    include: { user: { select: { id: true } } },
  });
  if (!request) throw new Error("Silme talebi bulunamadı");

  const userId = request.userId;
  const deletedData: string[] = [];

  await prisma.dataDeletionRequest.update({
    where: { id: requestId },
    data: { status: "ISLENIYOR", processedAt: new Date() },
  });

  // Process each data type
  for (const dataType of request.dataTypes) {
    switch (dataType) {
      case "profil":
        await prisma.user.update({
          where: { id: userId },
          data: { name: "Silinmiş Kullanıcı", phone: null, image: null },
        });
        deletedData.push("profil");
        break;

      case "teklifler":
        await prisma.bid.deleteMany({ where: { userId } });
        deletedData.push("teklifler");
        break;

      case "favori":
        await prisma.favorite.deleteMany({ where: { userId } });
        deletedData.push("favori");
        break;

      case "basvuru":
        await prisma.application.deleteMany({ where: { userId } });
        deletedData.push("basvuru");
        break;

      case "bildirim":
        await prisma.notification.deleteMany({ where: { userId } });
        deletedData.push("bildirim");
        break;

      case "arama":
        await prisma.searchHistory.deleteMany({ where: { userId } });
        deletedData.push("arama");
        break;

      case "sozlesme":
        await prisma.contract.deleteMany({ where: { userId } });
        deletedData.push("sozlesme");
        break;

      case "mesaj":
        await prisma.forumReply.deleteMany({ where: { authorId: userId } });
        await prisma.forumThread.deleteMany({ where: { authorId: userId } });
        deletedData.push("mesaj");
        break;
    }
  }

  await prisma.dataDeletionRequest.update({
    where: { id: requestId },
    data: { status: "TAMAMLANDI", completedAt: new Date() },
  });

  return {
    requestId,
    status: "TAMAMLANDI",
    deletedData,
    remainingDays: 0,
  };
}

export async function getDeletionRequests(userId: string) {
  return prisma.dataDeletionRequest.findMany({
    where: { userId },
    orderBy: { requestedAt: "desc" },
  });
}
