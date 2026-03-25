import { prisma } from "@/lib/prisma";
import type {
  ContractStatus,
  PaymentStatus,
  GuaranteeType,
  GuaranteeStatus,
} from "@/generated/prisma/client";

// ─── CONTRACT CRUD ───────────────────────────────────────

export async function createContract(
  userId: string,
  data: {
    tenderId: string;
    contractNo?: string;
    title: string;
    contractDate: Date;
    startDate: Date;
    endDate: Date;
    totalAmount: number;
    kdvRate?: number;
    advanceRate?: number;
    penaltyRate?: number;
    penaltyDetails?: string;
    warrantyMonths?: number;
    notes?: string;
  }
) {
  return prisma.contract.create({
    data: {
      userId,
      tenderId: data.tenderId,
      contractNo: data.contractNo || undefined,
      title: data.title,
      contractDate: data.contractDate,
      startDate: data.startDate,
      endDate: data.endDate,
      totalAmount: data.totalAmount,
      kdvRate: data.kdvRate ?? 20,
      advanceRate: data.advanceRate,
      penaltyRate: data.penaltyRate,
      penaltyDetails: data.penaltyDetails,
      warrantyMonths: data.warrantyMonths ?? 12,
      notes: data.notes,
      status: "AKTIF",
    },
    include: { tender: true },
  });
}

export async function getUserContracts(userId: string) {
  const contracts = await prisma.contract.findMany({
    where: { userId },
    include: {
      tender: { select: { title: true, institution: true, city: true } },
      payments: { select: { id: true, status: true, netAmount: true } },
      guarantees: { select: { id: true, type: true, status: true, expiryDate: true } },
      _count: { select: { workProgress: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return JSON.parse(JSON.stringify(contracts));
}

export async function getContractDetail(contractId: string, userId: string) {
  const contract = await prisma.contract.findFirst({
    where: { id: contractId, userId },
    include: {
      tender: { select: { title: true, institution: true, city: true, ekapNo: true } },
      payments: { orderBy: { periodNo: "asc" } },
      workProgress: { orderBy: { reportDate: "desc" } },
      guarantees: { orderBy: { expiryDate: "asc" } },
    },
  });
  if (!contract) return null;
  return JSON.parse(JSON.stringify(contract));
}

export async function updateContract(
  contractId: string,
  userId: string,
  data: Partial<{
    status: ContractStatus;
    title: string;
    notes: string;
    completionRate: number;
    endDate: Date;
  }>
) {
  return prisma.contract.updateMany({
    where: { id: contractId, userId },
    data,
  });
}

export async function deleteContract(contractId: string, userId: string) {
  return prisma.contract.deleteMany({
    where: { id: contractId, userId },
  });
}

// ─── PROGRESS PAYMENTS (HAKEDİŞ) ─────────────────────────

export async function createPayment(
  contractId: string,
  userId: string,
  data: {
    periodStart: Date;
    periodEnd: Date;
    grossAmount: number;
    deductions?: number;
    description?: string;
    notes?: string;
  }
) {
  // Verify ownership
  const contract = await prisma.contract.findFirst({
    where: { id: contractId, userId },
  });
  if (!contract) throw new Error("Sözleşme bulunamadı");

  // Auto-increment periodNo
  const lastPayment = await prisma.progressPayment.findFirst({
    where: { contractId },
    orderBy: { periodNo: "desc" },
  });
  const periodNo = (lastPayment?.periodNo ?? 0) + 1;
  const deductions = data.deductions ?? 0;
  const netAmount = data.grossAmount - deductions;

  return prisma.progressPayment.create({
    data: {
      contractId,
      periodNo,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      grossAmount: data.grossAmount,
      deductions,
      netAmount,
      description: data.description,
      notes: data.notes,
    },
  });
}

export async function updatePaymentStatus(
  paymentId: string,
  contractId: string,
  userId: string,
  status: PaymentStatus
) {
  const contract = await prisma.contract.findFirst({
    where: { id: contractId, userId },
  });
  if (!contract) throw new Error("Sözleşme bulunamadı");

  const now = new Date();
  const updateData: Record<string, unknown> = { status };
  if (status === "ONAY_BEKLIYOR") updateData.submittedAt = now;
  if (status === "ONAYLANDI") updateData.approvedAt = now;
  if (status === "ODENDI") {
    updateData.paidAt = now;
    // Update contract paid amount
    const payment = await prisma.progressPayment.findUnique({ where: { id: paymentId } });
    if (payment) {
      await prisma.contract.update({
        where: { id: contractId },
        data: { paidAmount: { increment: payment.netAmount } },
      });
    }
  }

  return prisma.progressPayment.update({
    where: { id: paymentId },
    data: updateData,
  });
}

// ─── WORK PROGRESS ───────────────────────────────────────

export async function addWorkProgress(
  contractId: string,
  userId: string,
  data: {
    title: string;
    description?: string;
    completionRate: number;
    isMilestone?: boolean;
    milestoneDate?: Date;
    photos?: Array<{ url: string; caption?: string }>;
    notes?: string;
  }
) {
  const contract = await prisma.contract.findFirst({
    where: { id: contractId, userId },
  });
  if (!contract) throw new Error("Sözleşme bulunamadı");

  const progress = await prisma.workProgress.create({
    data: {
      contractId,
      title: data.title,
      description: data.description,
      completionRate: data.completionRate,
      isMilestone: data.isMilestone ?? false,
      milestoneDate: data.milestoneDate,
      photos: data.photos ? JSON.parse(JSON.stringify(data.photos)) : undefined,
      notes: data.notes,
    },
  });

  // Update contract completion rate to latest
  await prisma.contract.update({
    where: { id: contractId },
    data: { completionRate: data.completionRate },
  });

  return progress;
}

// ─── SUPPLIER RATINGS ────────────────────────────────────

export async function rateSupplier(
  userId: string,
  data: {
    supplierName: string;
    supplierTaxNo?: string;
    contractTitle?: string;
    deliveryScore: number;
    qualityScore: number;
    communicationScore: number;
    priceScore: number;
    comment?: string;
  }
) {
  const overallScore =
    (data.deliveryScore + data.qualityScore + data.communicationScore + data.priceScore) / 4;

  return prisma.supplierRating.upsert({
    where: {
      userId_supplierName_contractTitle: {
        userId,
        supplierName: data.supplierName,
        contractTitle: data.contractTitle || "",
      },
    },
    create: {
      userId,
      supplierName: data.supplierName,
      supplierTaxNo: data.supplierTaxNo,
      contractTitle: data.contractTitle,
      deliveryScore: data.deliveryScore,
      qualityScore: data.qualityScore,
      communicationScore: data.communicationScore,
      priceScore: data.priceScore,
      overallScore,
      comment: data.comment,
    },
    update: {
      deliveryScore: data.deliveryScore,
      qualityScore: data.qualityScore,
      communicationScore: data.communicationScore,
      priceScore: data.priceScore,
      overallScore,
      comment: data.comment,
    },
  });
}

export async function getUserRatings(userId: string) {
  const ratings = await prisma.supplierRating.findMany({
    where: { userId },
    orderBy: { ratingDate: "desc" },
  });
  return JSON.parse(JSON.stringify(ratings));
}

// ─── GUARANTEES (TEMİNAT) ────────────────────────────────

export async function addGuarantee(
  contractId: string,
  userId: string,
  data: {
    type: GuaranteeType;
    bankName: string;
    letterNo?: string;
    amount: number;
    issueDate: Date;
    expiryDate: Date;
    notes?: string;
  }
) {
  const contract = await prisma.contract.findFirst({
    where: { id: contractId, userId },
  });
  if (!contract) throw new Error("Sözleşme bulunamadı");

  return prisma.guarantee.create({
    data: {
      contractId,
      type: data.type,
      bankName: data.bankName,
      letterNo: data.letterNo,
      amount: data.amount,
      issueDate: data.issueDate,
      expiryDate: data.expiryDate,
      notes: data.notes,
    },
  });
}

export async function updateGuaranteeStatus(
  guaranteeId: string,
  contractId: string,
  userId: string,
  status: GuaranteeStatus,
  returnDate?: Date
) {
  const contract = await prisma.contract.findFirst({
    where: { id: contractId, userId },
  });
  if (!contract) throw new Error("Sözleşme bulunamadı");

  return prisma.guarantee.update({
    where: { id: guaranteeId },
    data: {
      status,
      returnDate: returnDate || (status === "IADE_EDILDI" ? new Date() : undefined),
    },
  });
}

// ─── EXPIRING GUARANTEES ──────────────────────────────────

export async function getExpiringGuarantees(userId: string, daysAhead: number = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  const guarantees = await prisma.guarantee.findMany({
    where: {
      contract: { userId },
      status: "AKTIF",
      expiryDate: { lte: futureDate },
    },
    include: {
      contract: { select: { title: true, contractNo: true } },
    },
    orderBy: { expiryDate: "asc" },
  });
  return JSON.parse(JSON.stringify(guarantees));
}

// ─── CONTRACT SUMMARY ────────────────────────────────────

export async function getContractSummary(userId: string) {
  const contracts = await prisma.contract.findMany({
    where: { userId },
    include: {
      payments: true,
      guarantees: { where: { status: "AKTIF" } },
    },
  });

  const totalContracts = contracts.length;
  const activeContracts = contracts.filter((c) =>
    ["AKTIF", "DEVAM_EDIYOR"].includes(c.status)
  ).length;
  const totalValue = contracts.reduce((s, c) => s + Number(c.totalAmount), 0);
  const totalPaid = contracts.reduce((s, c) => s + Number(c.paidAmount), 0);
  const activeGuarantees = contracts.reduce((s, c) => s + c.guarantees.length, 0);
  const avgCompletion =
    activeContracts > 0
      ? contracts
          .filter((c) => ["AKTIF", "DEVAM_EDIYOR"].includes(c.status))
          .reduce((s, c) => s + c.completionRate, 0) / activeContracts
      : 0;

  return {
    totalContracts,
    activeContracts,
    totalValue,
    totalPaid,
    remainingValue: totalValue - totalPaid,
    activeGuarantees,
    avgCompletion: Math.round(avgCompletion),
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
