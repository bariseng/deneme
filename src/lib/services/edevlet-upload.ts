// ─── e-Devlet Document Upload Service ───────────────────────
// e-Devlet API özel sektöre AÇIK DEĞİL — PDF upload stratejisi
// Kullanıcı e-Devlet'ten belge alır, İhalePro'ya yükler

import { prisma } from "@/lib/prisma";
import { ProviderCache } from "@/lib/providers/cache";

const cache = new ProviderCache();

// ─── Types ──────────────────────────────────────────────────

export interface EDevletDocument {
  id: string;
  userId: string;
  documentType: EDevletDocType;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  verificationStatus: "pending" | "verified" | "rejected";
  uploadedAt: Date;
  expiresAt: Date | null;
  notes?: string;
}

export type EDevletDocType =
  | "ticaret_sicil"        // Ticaret Sicil Gazetesi
  | "vergi_borcu"          // Vergi Borcu Yoktur Belgesi
  | "sgk_borcu"            // SGK Borcu Yoktur Belgesi
  | "imza_sirkusu"         // İmza Sirküleri
  | "faaliyet_belgesi"     // Faaliyet Belgesi
  | "adli_sicil"           // Adli Sicil Kaydı
  | "yetki_belgesi"        // Yetki Belgesi
  | "vergi_levhasi"        // Vergi Levhası
  | "kapasite_raporu"      // Kapasite Raporu
  | "is_deneyim";          // İş Deneyim Belgesi

export const EDEVLET_DOC_TYPES: { id: EDevletDocType; label: string; required: boolean; validityDays: number; edevletPath: string }[] = [
  { id: "ticaret_sicil", label: "Ticaret Sicil Gazetesi", required: true, validityDays: 365, edevletPath: "turkiye.gov.tr/ticaret-sicil-gazetesi-sorgulama" },
  { id: "vergi_borcu", label: "Vergi Borcu Yoktur Belgesi", required: true, validityDays: 30, edevletPath: "turkiye.gov.tr/gib-vergi-borcu-yoktur-yazisi" },
  { id: "sgk_borcu", label: "SGK Borcu Yoktur Belgesi", required: true, validityDays: 30, edevletPath: "turkiye.gov.tr/sgk-tescil-ve-hizmet-dokumu" },
  { id: "imza_sirkusu", label: "İmza Sirküleri", required: true, validityDays: 365, edevletPath: "turkiye.gov.tr/noter-bilgi-sistemi" },
  { id: "faaliyet_belgesi", label: "Faaliyet Belgesi", required: true, validityDays: 365, edevletPath: "turkiye.gov.tr/ticaret-odasi-faaliyet-belgesi" },
  { id: "adli_sicil", label: "Adli Sicil Kaydı", required: false, validityDays: 30, edevletPath: "turkiye.gov.tr/adli-sicil-kaydi" },
  { id: "yetki_belgesi", label: "Yetki Belgesi", required: false, validityDays: 365, edevletPath: "turkiye.gov.tr/ticaret-sicil-yetki-belgesi" },
  { id: "vergi_levhasi", label: "Vergi Levhası", required: false, validityDays: 365, edevletPath: "turkiye.gov.tr/gib-vergi-levhasi" },
  { id: "kapasite_raporu", label: "Kapasite Raporu", required: false, validityDays: 365, edevletPath: "turkiye.gov.tr/tobb-kapasite-raporu" },
  { id: "is_deneyim", label: "İş Deneyim Belgesi", required: false, validityDays: 365, edevletPath: "" },
];

// ─── Upload & Track ─────────────────────────────────────────

export async function registerUpload(
  userId: string,
  documentType: EDevletDocType,
  fileName: string,
  fileUrl: string,
  fileSize: number,
): Promise<EDevletDocument> {
  const docConfig = EDEVLET_DOC_TYPES.find((d) => d.id === documentType);
  if (!docConfig) throw new Error("Geçersiz belge türü");

  const expiresAt = docConfig.validityDays > 0
    ? new Date(Date.now() + docConfig.validityDays * 86400_000)
    : null;

  // Store in CachedData as lightweight document record
  const key = `edevlet_doc:${userId}:${documentType}`;
  const doc: EDevletDocument = {
    id: key,
    userId,
    documentType,
    fileName,
    fileUrl,
    fileSize,
    verificationStatus: "pending",
    uploadedAt: new Date(),
    expiresAt,
  };

  await prisma.cachedData.upsert({
    where: { key },
    create: {
      key,
      value: JSON.parse(JSON.stringify(doc)),
      provider: "EDEVLET",
      ttl: docConfig.validityDays * 86400,
      expiresAt: expiresAt || new Date(Date.now() + 365 * 86400_000),
    },
    update: {
      value: JSON.parse(JSON.stringify(doc)),
      ttl: docConfig.validityDays * 86400,
      expiresAt: expiresAt || new Date(Date.now() + 365 * 86400_000),
    },
  });

  return doc;
}

// ─── Retrieve Documents ─────────────────────────────────────

export async function getUserDocuments(userId: string): Promise<EDevletDocument[]> {
  const cacheKey = `edevlet_all:${userId}`;
  const cached = await cache.get<EDevletDocument[]>(cacheKey);
  if (cached) return cached;

  const records = await prisma.cachedData.findMany({
    where: {
      key: { startsWith: `edevlet_doc:${userId}:` },
      provider: "EDEVLET",
    },
  });

  const docs = records.map((r) => r.value as unknown as EDevletDocument);
  await cache.set(cacheKey, docs, { ttl: 300, staleWhileRevalidate: true, key: "edev" }, "EDEVLET");
  return docs;
}

export async function getDocument(userId: string, docType: EDevletDocType): Promise<EDevletDocument | null> {
  const key = `edevlet_doc:${userId}:${docType}`;
  const record = await prisma.cachedData.findUnique({ where: { key } });
  if (!record) return null;
  return record.value as unknown as EDevletDocument;
}

// ─── Verification ───────────────────────────────────────────

export async function verifyDocument(
  userId: string,
  docType: EDevletDocType,
  status: "verified" | "rejected",
  notes?: string,
): Promise<void> {
  const key = `edevlet_doc:${userId}:${docType}`;
  const record = await prisma.cachedData.findUnique({ where: { key } });
  if (!record) throw new Error("Belge bulunamadı");

  const doc = record.value as unknown as EDevletDocument;
  doc.verificationStatus = status;
  doc.notes = notes;

  await prisma.cachedData.update({
    where: { key },
    data: { value: JSON.parse(JSON.stringify(doc)) },
  });
}

// ─── Completeness Check ─────────────────────────────────────

export async function checkDocumentCompleteness(userId: string): Promise<{
  complete: boolean;
  missing: string[];
  expired: string[];
  total: number;
  uploaded: number;
}> {
  const docs = await getUserDocuments(userId);
  const required = EDEVLET_DOC_TYPES.filter((d) => d.required);
  const now = new Date();

  const missing: string[] = [];
  const expired: string[] = [];

  for (const req of required) {
    const doc = docs.find((d) => d.documentType === req.id);
    if (!doc) {
      missing.push(req.label);
    } else if (doc.expiresAt && new Date(doc.expiresAt) < now) {
      expired.push(req.label);
    }
  }

  return {
    complete: missing.length === 0 && expired.length === 0,
    missing,
    expired,
    total: required.length,
    uploaded: docs.filter((d) => required.some((r) => r.id === d.documentType)).length,
  };
}
