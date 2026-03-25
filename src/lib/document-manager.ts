/**
 * E-Signature & Document Management Library
 * Version control, signature workflows, approval chains, OCR, sharing
 */

import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// ─── Document Versioning ────────────────────────────────

export async function createVersion(params: {
  documentId: string;
  fileUrl: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  changeSummary?: string;
  createdById: string;
}): Promise<{ version: number; id: string }> {
  // Get next version number
  const lastVersion = await prisma.documentVersion.findFirst({
    where: { documentId: params.documentId },
    orderBy: { version: "desc" },
  });

  const nextVersion = (lastVersion?.version ?? 0) + 1;

  const ver = await prisma.documentVersion.create({
    data: {
      documentId: params.documentId,
      version: nextVersion,
      fileUrl: params.fileUrl,
      fileName: params.fileName,
      fileSize: params.fileSize,
      mimeType: params.mimeType,
      changeSummary: params.changeSummary,
      createdById: params.createdById,
    },
  });

  return { version: nextVersion, id: ver.id };
}

export async function getVersionHistory(documentId: string) {
  return prisma.documentVersion.findMany({
    where: { documentId },
    include: {
      createdBy: { select: { id: true, name: true, image: true } },
      signatures: {
        include: {
          signer: { select: { id: true, name: true, image: true } },
        },
      },
    },
    orderBy: { version: "desc" },
  });
}

export async function revertToVersion(documentId: string, targetVersion: number, userId: string) {
  const ver = await prisma.documentVersion.findUnique({
    where: { documentId_version: { documentId, version: targetVersion } },
  });

  if (!ver) throw new Error("Versiyon bulunamadı");

  // Create a new version from the old one
  return createVersion({
    documentId,
    fileUrl: ver.fileUrl,
    fileName: ver.fileName,
    fileSize: ver.fileSize ?? undefined,
    mimeType: ver.mimeType ?? undefined,
    changeSummary: `v${targetVersion} versiyonuna geri dönüldü`,
    createdById: userId,
  });
}

// ─── E-Signature ────────────────────────────────────────

export async function requestSignature(params: {
  versionId: string;
  signerId: string;
  method?: string;
}): Promise<{ id: string }> {
  const req = await prisma.signatureRequest.create({
    data: {
      versionId: params.versionId,
      signerId: params.signerId,
      method: params.method || "e_devlet",
    },
  });

  return { id: req.id };
}

export async function signDocument(
  requestId: string,
  certificateId: string
): Promise<void> {
  await prisma.signatureRequest.update({
    where: { id: requestId },
    data: {
      status: "IMZALANDI",
      signedAt: new Date(),
      certificateId,
    },
  });
}

export async function rejectSignature(
  requestId: string,
  reason: string
): Promise<void> {
  await prisma.signatureRequest.update({
    where: { id: requestId },
    data: {
      status: "REDDEDILDI",
      rejectedAt: new Date(),
      reason,
    },
  });
}

export async function getSignatureRequests(userId: string) {
  return prisma.signatureRequest.findMany({
    where: { signerId: userId },
    include: {
      version: {
        include: {
          document: { select: { id: true, name: true, tenderId: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

// ─── Approval Workflow ──────────────────────────────────

const DEFAULT_STEPS = [
  { step: 1, stepTitle: "Departman Müdürü Onayı" },
  { step: 2, stepTitle: "Genel Müdür Onayı" },
  { step: 3, stepTitle: "Gönderim Onayı" },
];

export async function initApprovalWorkflow(
  projectId: string,
  approverIds: string[] // [deptManagerId, gmId, senderId]
): Promise<void> {
  // Delete any existing workflow
  await prisma.approvalWorkflow.deleteMany({ where: { projectId } });

  for (let i = 0; i < DEFAULT_STEPS.length; i++) {
    const approverId = approverIds[i];
    if (!approverId) continue;

    await prisma.approvalWorkflow.create({
      data: {
        projectId,
        step: DEFAULT_STEPS[i].step,
        stepTitle: DEFAULT_STEPS[i].stepTitle,
        approverId,
      },
    });
  }
}

export async function approveStep(
  workflowId: string,
  comment?: string
): Promise<{ nextStep: number | null }> {
  const workflow = await prisma.approvalWorkflow.update({
    where: { id: workflowId },
    data: {
      status: "ONAYLANDI",
      comment,
      decidedAt: new Date(),
    },
  });

  // Check if there's a next step
  const nextStep = await prisma.approvalWorkflow.findFirst({
    where: {
      projectId: workflow.projectId,
      step: workflow.step + 1,
    },
  });

  return { nextStep: nextStep?.step ?? null };
}

export async function rejectStep(
  workflowId: string,
  comment: string
): Promise<void> {
  await prisma.approvalWorkflow.update({
    where: { id: workflowId },
    data: {
      status: "REDDEDILDI",
      comment,
      decidedAt: new Date(),
    },
  });
}

export async function getProjectApprovals(projectId: string) {
  return prisma.approvalWorkflow.findMany({
    where: { projectId },
    include: {
      approver: { select: { id: true, name: true, image: true } },
    },
    orderBy: { step: "asc" },
  });
}

// ─── OCR Document Scanning ──────────────────────────────

export async function simulateOCR(text: string): Promise<{
  extractedText: string;
  confidence: number;
  pageCount: number;
  keywords: string[];
}> {
  // Simulated OCR — in production, integrate Tesseract.js or cloud OCR
  const keywords = extractKeywords(text);

  return {
    extractedText: text,
    confidence: 0.92,
    pageCount: Math.ceil(text.length / 3000),
    keywords,
  };
}

function extractKeywords(text: string): string[] {
  const ihaleKeywords = [
    "ihale", "teklif", "şartname", "yaklaşık maliyet", "geçici teminat",
    "kesin teminat", "iş deneyim", "birim fiyat", "sözleşme", "fatura",
    "kdv", "damga vergisi", "muayene", "kabul", "hak ediş",
  ];

  return ihaleKeywords.filter((k) =>
    text.toLowerCase().includes(k)
  );
}

export async function saveOCRResult(
  versionId: string,
  ocrText: string
): Promise<void> {
  await prisma.documentVersion.update({
    where: { id: versionId },
    data: { ocrText },
  });
}

// ─── Secure Document Sharing ────────────────────────────

export async function createShareLink(params: {
  documentId: string;
  createdById: string;
  expiresInHours?: number;
  maxDownloads?: number;
}): Promise<{ token: string; expiresAt: Date }> {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + (params.expiresInHours || 24));

  const token = crypto.randomBytes(32).toString("hex");

  await prisma.shareLink.create({
    data: {
      documentId: params.documentId,
      token,
      expiresAt,
      maxDownloads: params.maxDownloads || 1,
      createdById: params.createdById,
    },
  });

  return { token, expiresAt };
}

export async function validateShareLink(token: string): Promise<{
  valid: boolean;
  documentId?: string;
  message?: string;
}> {
  const link = await prisma.shareLink.findUnique({
    where: { token },
  });

  if (!link) {
    return { valid: false, message: "Paylaşım linki geçersiz" };
  }

  if (link.expiresAt < new Date()) {
    return { valid: false, message: "Paylaşım linkinin süresi dolmuş" };
  }

  if (link.downloadCount >= link.maxDownloads) {
    return { valid: false, message: "İndirme limiti aşıldı" };
  }

  // Increment download count
  await prisma.shareLink.update({
    where: { id: link.id },
    data: { downloadCount: { increment: 1 } },
  });

  return { valid: true, documentId: link.documentId };
}
