import { prisma } from "@/lib/prisma";
import type {
  GuaranteeRequestType,
  FinanceRequestStatus,
  InsuranceType,
  FinancialPartnerType,
} from "@/generated/prisma/client";

// ─── PARA FORMATLAMA ────────────────────────────────────────

export function formatTRY(val: number | string): string {
  return Number(val).toLocaleString("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ─── TEMİNAT MEKTUBU TALEBI ────────────────────────────────

export async function createGuaranteeRequest(data: {
  userId: string;
  tenderId?: string;
  type: GuaranteeRequestType;
  amount: number;
  duration: number;
  description?: string;
}) {
  const req = await prisma.guaranteeRequest.create({
    data: {
      userId: data.userId,
      tenderId: data.tenderId || undefined,
      type: data.type,
      amount: data.amount,
      duration: data.duration,
      description: data.description,
    },
    include: { user: { select: { id: true, name: true, email: true } }, tender: { select: { id: true, title: true } } },
  });

  // Mock: otomatik teklif üret
  await generateMockGuaranteeOffers(req.id, Number(data.amount), data.duration);

  // Durumu güncelle
  await prisma.guaranteeRequest.update({
    where: { id: req.id },
    data: { status: "TEKLIFLER_ALINDI" },
  });

  return req;
}

export async function getGuaranteeRequests(userId?: string) {
  return prisma.guaranteeRequest.findMany({
    where: userId ? { userId } : {},
    include: {
      tender: { select: { id: true, title: true } },
      _count: { select: { offers: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getGuaranteeRequestById(id: string) {
  return prisma.guaranteeRequest.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      tender: { select: { id: true, title: true, estimatedCost: true } },
      offers: {
        include: {
          provider: { select: { id: true, name: true, logoUrl: true, type: true } },
        },
        orderBy: { totalCost: "asc" },
      },
    },
  });
}

// ─── SİGORTA TALEBI ────────────────────────────────────────

export async function createInsuranceRequest(data: {
  userId: string;
  tenderId?: string;
  type: InsuranceType;
  coverageAmount: number;
  duration: number;
  description?: string;
}) {
  const req = await prisma.insuranceRequest.create({
    data: {
      userId: data.userId,
      tenderId: data.tenderId || undefined,
      type: data.type,
      coverageAmount: data.coverageAmount,
      duration: data.duration,
      description: data.description,
    },
    include: { user: { select: { id: true, name: true, email: true } }, tender: { select: { id: true, title: true } } },
  });

  await generateMockInsuranceOffers(req.id, Number(data.coverageAmount), data.duration, data.type);

  await prisma.insuranceRequest.update({
    where: { id: req.id },
    data: { status: "TEKLIFLER_ALINDI" },
  });

  return req;
}

export async function getInsuranceRequests(userId?: string) {
  return prisma.insuranceRequest.findMany({
    where: userId ? { userId } : {},
    include: {
      tender: { select: { id: true, title: true } },
      _count: { select: { offers: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getInsuranceRequestById(id: string) {
  return prisma.insuranceRequest.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      tender: { select: { id: true, title: true } },
      offers: {
        include: {
          provider: { select: { id: true, name: true, logoUrl: true, type: true } },
        },
        orderBy: { premium: "asc" },
      },
    },
  });
}

// ─── FİNANS PARTNERLERİ ────────────────────────────────────

export async function getFinancialPartners(type?: FinancialPartnerType) {
  return prisma.financialPartner.findMany({
    where: { isActive: true, ...(type && { type }) },
    orderBy: { name: "asc" },
  });
}

export async function seedFinancialPartners() {
  const count = await prisma.financialPartner.count();
  if (count > 0) return;

  const partners = [
    { name: "Ziraat Bankası", type: "BANKA" as const, commissionRate: 1.2, contactEmail: "teminat@ziraatbank.com.tr" },
    { name: "İş Bankası", type: "BANKA" as const, commissionRate: 1.35, contactEmail: "teminat@isbank.com.tr" },
    { name: "Garanti BBVA", type: "BANKA" as const, commissionRate: 1.45, contactEmail: "teminat@garantibbva.com.tr" },
    { name: "Yapı Kredi", type: "BANKA" as const, commissionRate: 1.4, contactEmail: "teminat@yapikredi.com.tr" },
    { name: "Halkbank", type: "BANKA" as const, commissionRate: 1.15, contactEmail: "teminat@halkbank.com.tr" },
    { name: "VakıfBank", type: "BANKA" as const, commissionRate: 1.25, contactEmail: "teminat@vakifbank.com.tr" },
    { name: "Anadolu Sigorta", type: "SIGORTA" as const, commissionRate: 2.5, contactEmail: "info@anadolusigorta.com.tr" },
    { name: "Allianz Türkiye", type: "SIGORTA" as const, commissionRate: 2.8, contactEmail: "info@allianz.com.tr" },
    { name: "AXA Sigorta", type: "SIGORTA" as const, commissionRate: 2.6, contactEmail: "info@axasigorta.com.tr" },
    { name: "Mapfre Sigorta", type: "SIGORTA" as const, commissionRate: 2.4, contactEmail: "info@mapfre.com.tr" },
  ];

  await prisma.financialPartner.createMany({ data: partners });
}

// ─── LEAD LOG ───────────────────────────────────────────────

export async function createLeadLog(data: {
  userId: string;
  partnerId: string;
  offerType: "GUARANTEE" | "INSURANCE";
  offerId: string;
  amount: number;
}) {
  return prisma.financeLeadLog.create({
    data: {
      userId: data.userId,
      partnerId: data.partnerId,
      offerType: data.offerType,
      offerId: data.offerId,
      amount: data.amount,
    },
  });
}

export async function selectOffer(offerType: "GUARANTEE" | "INSURANCE", offerId: string) {
  if (offerType === "GUARANTEE") {
    return prisma.guaranteeOffer.update({
      where: { id: offerId },
      data: { isSelected: true },
    });
  } else {
    return prisma.insuranceOffer.update({
      where: { id: offerId },
      data: { isSelected: true },
    });
  }
}

// ─── İSTATİSTİKLER ──────────────────────────────────────────

export async function getFinanceStats(userId?: string) {
  const userWhere = userId ? { userId } : {};

  const [
    guaranteeCount,
    insuranceCount,
    guaranteePending,
    insurancePending,
    leadCount,
  ] = await Promise.all([
    prisma.guaranteeRequest.count({ where: userWhere }),
    prisma.insuranceRequest.count({ where: userWhere }),
    prisma.guaranteeRequest.count({ where: { ...userWhere, status: "BEKLEMEDE" } }),
    prisma.insuranceRequest.count({ where: { ...userWhere, status: "BEKLEMEDE" } }),
    prisma.financeLeadLog.count({ where: userId ? { userId } : {} }),
  ]);

  return {
    guaranteeCount,
    insuranceCount,
    guaranteePending,
    insurancePending,
    leadCount,
    totalRequests: guaranteeCount + insuranceCount,
  };
}

// ─── MOCK TEKLİF ÜRETECİ ───────────────────────────────────

async function generateMockGuaranteeOffers(requestId: string, amount: number, durationDays: number) {
  const banks = await prisma.financialPartner.findMany({
    where: { type: "BANKA", isActive: true },
  });

  if (banks.length === 0) {
    await seedFinancialPartners();
    const seeded = await prisma.financialPartner.findMany({ where: { type: "BANKA", isActive: true } });
    banks.push(...seeded);
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const offers = banks.map((bank) => {
    const baseRate = bank.commissionRate + (Math.random() * 0.5 - 0.25);
    const interestRate = Math.max(0.5, Math.round(baseRate * 100) / 100);
    const commission = Math.round(amount * (interestRate / 100) * (durationDays / 365));
    const processingDays = Math.floor(Math.random() * 3) + 1;

    return {
      requestId,
      providerId: bank.id,
      providerName: bank.name,
      interestRate,
      commission,
      processingDays,
      totalCost: commission,
      expiresAt,
    };
  });

  await prisma.guaranteeOffer.createMany({ data: offers });
}

async function generateMockInsuranceOffers(
  requestId: string,
  coverageAmount: number,
  durationMonths: number,
  type: InsuranceType
) {
  const insurers = await prisma.financialPartner.findMany({
    where: { type: "SIGORTA", isActive: true },
  });

  if (insurers.length === 0) {
    await seedFinancialPartners();
    const seeded = await prisma.financialPartner.findMany({ where: { type: "SIGORTA", isActive: true } });
    insurers.push(...seeded);
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const rateMap: Record<string, number> = {
    MESLEKI: 0.003,
    ALL_RISK: 0.005,
    ISG: 0.002,
  };
  const baseRate = rateMap[type] || 0.004;

  const offers = insurers.map((insurer) => {
    const rateVariation = baseRate + (Math.random() * 0.002 - 0.001);
    const annualPremium = Math.round(coverageAmount * rateVariation);
    const premium = Math.round(annualPremium * (durationMonths / 12));
    const deductible = Math.round(coverageAmount * 0.01);
    const processingDays = Math.floor(Math.random() * 5) + 2;

    const coverageDetails: Record<string, unknown> = {
      type,
      coverage: [
        type === "MESLEKI" && "Mesleki sorumluluk",
        type === "ALL_RISK" && "İnşaat tüm riskler",
        type === "ISG" && "İş sağlığı ve güvenliği",
        "Üçüncü şahıs sorumluluk",
        "Doğal afet teminatı",
      ].filter(Boolean),
      exclusions: ["Kasıt ve ağır ihmal", "Nükleer riskler"],
      maxPayment: coverageAmount,
    };

    return {
      requestId,
      providerId: insurer.id,
      providerName: insurer.name,
      premium,
      deductible,
      coverageDetails: JSON.parse(JSON.stringify(coverageDetails)),
      processingDays,
      expiresAt,
    };
  });

  await prisma.insuranceOffer.createMany({ data: offers });
}

// ─── SABİTLER ───────────────────────────────────────────────

export const GUARANTEE_TYPES = [
  { value: "GECICI", label: "Geçici Teminat Mektubu" },
  { value: "KESIN", label: "Kesin Teminat Mektubu" },
  { value: "AVANS", label: "Avans Teminat Mektubu" },
];

export const INSURANCE_TYPES = [
  { value: "MESLEKI", label: "Mesleki Sorumluluk Sigortası" },
  { value: "ALL_RISK", label: "İnşaat All-Risk Sigortası" },
  { value: "ISG", label: "İş Sağlığı ve Güvenliği Sigortası" },
];

export const REQUEST_STATUS_MAP: Record<string, { label: string; color: string }> = {
  BEKLEMEDE: { label: "Beklemede", color: "bg-yellow-100 text-yellow-800" },
  TEKLIFLER_ALINDI: { label: "Teklifler Geldi", color: "bg-blue-100 text-blue-800" },
  ONAYLANDI: { label: "Onaylandı", color: "bg-green-100 text-green-800" },
  REDDEDILDI: { label: "Reddedildi", color: "bg-red-100 text-red-800" },
  IPTAL: { label: "İptal", color: "bg-gray-100 text-gray-800" },
};
