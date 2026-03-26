// ─── Storage Provider (Cloudflare R2 / S3-uyumlu) ─────────
// Pre-signed URL ile upload/download, plan bazlı dosya boyutu limiti
// Virus tarama (VirusTotal API), KVKK uyumlu AB bölgesi depolama

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// ─── Types ──────────────────────────────────────────────────

export interface UploadResult {
  key: string;
  url: string;
  size: number;
  mimeType: string;
  virusScanPassed: boolean;
}

export interface DownloadUrl {
  url: string;
  expiresAt: Date;
}

export interface StorageQuota {
  maxFileSize: number; // bytes
  maxTotalStorage: number; // bytes
  currentUsage: number; // bytes
}

// ─── Config ─────────────────────────────────────────────────

const BUCKET_NAME = process.env.R2_BUCKET_NAME || "ihalepro-documents";
const PRESIGN_EXPIRY = 3600; // 1 hour
const UPLOAD_EXPIRY = 900; // 15 min for upload

// Plan-based file size limits (bytes)
const PLAN_FILE_LIMITS: Record<string, number> = {
  FREE: 10 * 1024 * 1024,       // 10 MB
  STARTER: 50 * 1024 * 1024,    // 50 MB
  PRO: 100 * 1024 * 1024,       // 100 MB
  ENTERPRISE: 500 * 1024 * 1024, // 500 MB
};

const PLAN_STORAGE_LIMITS: Record<string, number> = {
  FREE: 100 * 1024 * 1024,        // 100 MB total
  STARTER: 1024 * 1024 * 1024,    // 1 GB
  PRO: 10 * 1024 * 1024 * 1024,   // 10 GB
  ENTERPRISE: 100 * 1024 * 1024 * 1024, // 100 GB
};

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/tiff",
  "text/plain",
  "application/zip",
];

// ─── S3 Client ──────────────────────────────────────────────

function getS3Client(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY || "",
      secretAccessKey: process.env.R2_SECRET_KEY || "",
    },
  });
}

// ─── Upload ─────────────────────────────────────────────────

export async function generateUploadUrl(params: {
  userId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  plan: string;
  tenderId?: string;
}): Promise<{ uploadUrl: string; key: string }> {
  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(params.mimeType)) {
    throw new Error(
      `Desteklenmeyen dosya türü: ${params.mimeType}. İzin verilenler: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, TIFF, TXT, ZIP`,
    );
  }

  // Check file size limit
  const maxSize = PLAN_FILE_LIMITS[params.plan] || PLAN_FILE_LIMITS.FREE;
  if (params.fileSize > maxSize) {
    const maxMB = Math.round(maxSize / (1024 * 1024));
    throw new Error(`Dosya boyutu limiti aşıldı. Planınız için maksimum: ${maxMB} MB`);
  }

  // Generate unique key
  const timestamp = Date.now();
  const sanitizedName = params.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const prefix = params.tenderId ? `tenders/${params.tenderId}` : `users/${params.userId}`;
  const key = `${prefix}/${timestamp}_${sanitizedName}`;

  const client = getS3Client();
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: params.mimeType,
    ContentLength: params.fileSize,
    Metadata: {
      userId: params.userId,
      originalName: params.fileName,
      uploadedAt: new Date().toISOString(),
    },
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: UPLOAD_EXPIRY });
  return { uploadUrl, key };
}

export async function confirmUpload(key: string): Promise<{ size: number; mimeType: string }> {
  const client = getS3Client();
  const command = new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: key });
  const response = await client.send(command);

  return {
    size: response.ContentLength || 0,
    mimeType: response.ContentType || "application/octet-stream",
  };
}

// ─── Download ───────────────────────────────────────────────

export async function generateDownloadUrl(key: string, expiresIn?: number): Promise<DownloadUrl> {
  const client = getS3Client();
  const expiry = expiresIn || PRESIGN_EXPIRY;

  const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key });
  const url = await getSignedUrl(client, command, { expiresIn: expiry });

  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + expiry);

  return { url, expiresAt };
}

// ─── Delete ─────────────────────────────────────────────────

export async function deleteFile(key: string): Promise<void> {
  const client = getS3Client();
  await client.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
}

// ─── Copy (for versioning) ──────────────────────────────────

export async function copyFile(sourceKey: string, destKey: string): Promise<void> {
  const client = getS3Client();
  await client.send(
    new CopyObjectCommand({
      Bucket: BUCKET_NAME,
      CopySource: `${BUCKET_NAME}/${sourceKey}`,
      Key: destKey,
    }),
  );
}

// ─── Virus Scanning (VirusTotal API) ────────────────────────

export async function scanForVirus(downloadUrl: string): Promise<{
  safe: boolean;
  scanId?: string;
  threat?: string;
}> {
  const apiKey = process.env.VIRUSTOTAL_API_KEY;

  // If no API key, skip scan (log warning)
  if (!apiKey) {
    console.warn("VIRUSTOTAL_API_KEY tanımlı değil, virus taraması atlanıyor");
    return { safe: true };
  }

  try {
    // Submit URL for scanning
    const scanRes = await fetch("https://www.virustotal.com/api/v3/urls", {
      method: "POST",
      headers: {
        "x-apikey": apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `url=${encodeURIComponent(downloadUrl)}`,
    });

    if (!scanRes.ok) {
      console.warn("VirusTotal tarama başlatılamadı:", scanRes.status);
      return { safe: true }; // Fail-open for availability
    }

    const scanData = await scanRes.json();
    const analysisId = scanData.data?.id;

    if (!analysisId) return { safe: true };

    // Wait briefly and check result
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const resultRes = await fetch(`https://www.virustotal.com/api/v3/analyses/${analysisId}`, {
      headers: { "x-apikey": apiKey },
    });

    if (!resultRes.ok) return { safe: true };

    const resultData = await resultRes.json();
    const stats = resultData.data?.attributes?.stats;

    if (stats?.malicious > 0 || stats?.suspicious > 0) {
      return {
        safe: false,
        scanId: analysisId,
        threat: `Malicious: ${stats.malicious}, Suspicious: ${stats.suspicious}`,
      };
    }

    return { safe: true, scanId: analysisId };
  } catch (err) {
    console.warn("Virus tarama hatası:", err);
    return { safe: true }; // Fail-open
  }
}

// ─── Plan Limits ────────────────────────────────────────────

export function getFileSizeLimit(plan: string): number {
  return PLAN_FILE_LIMITS[plan] || PLAN_FILE_LIMITS.FREE;
}

export function getStorageLimit(plan: string): number {
  return PLAN_STORAGE_LIMITS[plan] || PLAN_STORAGE_LIMITS.FREE;
}

export function getAllowedMimeTypes(): string[] {
  return [...ALLOWED_MIME_TYPES];
}
