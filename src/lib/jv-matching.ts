import { prisma } from "@/lib/prisma";
import type { JvRequestStatus, JvMatchStatus } from "@/generated/prisma/client";

// ─── KOMŞU İLLER HARİTASI ──────────────────────────────────
const NEIGHBOR_CITIES: Record<string, string[]> = {
  İstanbul: ["Kocaeli", "Tekirdağ", "Bursa", "Yalova"],
  Ankara: ["Eskişehir", "Konya", "Kırıkkale", "Çankırı", "Bolu", "Kırşehir"],
  İzmir: ["Manisa", "Aydın", "Balıkesir", "Muğla", "Denizli"],
  Bursa: ["İstanbul", "Kocaeli", "Yalova", "Bilecik", "Eskişehir", "Balıkesir"],
  Antalya: ["Burdur", "Isparta", "Konya", "Mersin", "Muğla"],
  Adana: ["Mersin", "Hatay", "Osmaniye", "Konya", "Niğde", "Kayseri"],
  Konya: ["Ankara", "Aksaray", "Karaman", "Antalya", "Isparta", "Afyon"],
  Gaziantep: ["Adıyaman", "Kilis", "Hatay", "Osmaniye", "Kahramanmaraş", "Şanlıurfa"],
  Kayseri: ["Sivas", "Yozgat", "Nevşehir", "Niğde", "Adana", "Kahramanmaraş"],
  Trabzon: ["Rize", "Giresun", "Gümüşhane", "Bayburt"],
  Mersin: ["Adana", "Antalya", "Konya", "Karaman", "Niğde"],
  Kocaeli: ["İstanbul", "Sakarya", "Bursa", "Yalova"],
  Eskişehir: ["Ankara", "Bursa", "Kütahya", "Bilecik", "Afyon", "Bolu"],
  Diyarbakır: ["Batman", "Bingöl", "Elazığ", "Mardin", "Muş", "Siirt", "Şanlıurfa"],
  Samsun: ["Ordu", "Amasya", "Tokat", "Sinop", "Çorum"],
};

function areNeighborCities(city1: string, city2: string): boolean {
  const n1 = NEIGHBOR_CITIES[city1];
  if (n1 && n1.includes(city2)) return true;
  const n2 = NEIGHBOR_CITIES[city2];
  if (n2 && n2.includes(city1)) return true;
  return false;
}

// ─── SKORLAMA ALGORİTMASI ───────────────────────────────────

interface CompanyProfile {
  id: string;
  name: string;
  city: string | null;
  sector: string | null;
  description: string | null;
  foundedYear: number | null;
  employeeCount: number | null;
}

interface MatchScore {
  companyId: string;
  companyName: string;
  totalScore: number;
  breakdown: {
    sectorScore: number;
    cityScore: number;
    experienceScore: number;
    successScore: number;
  };
}

export function calculateCompatibility(
  request: {
    requiredSpecialty: string;
    city: string;
    requiredExperienceAmount: number;
  },
  candidate: CompanyProfile,
  candidateStats: { wonTenders: number; totalBids: number; totalExperience: number }
): MatchScore {
  let sectorScore = 0;
  let cityScore = 0;
  let experienceScore = 0;
  let successScore = 0;

  // 1. Sektör uyumu (+30 max)
  if (candidate.sector) {
    const sectorMap: Record<string, string[]> = {
      YAPIM: ["yapım", "inşaat", "müteahhit", "taahhüt"],
      HIZMET: ["hizmet", "danışmanlık", "temizlik", "güvenlik"],
      MAL_ALIMI: ["mal", "tedarik", "üretim", "imalat"],
      DANISMANLIK: ["danışmanlık", "mühendislik", "mimarlık", "proje"],
    };
    const keywords = sectorMap[request.requiredSpecialty] || [];
    const sectorLower = candidate.sector.toLowerCase();
    if (keywords.some((k) => sectorLower.includes(k))) {
      sectorScore = 30;
    } else if (candidate.sector.toUpperCase() === request.requiredSpecialty) {
      sectorScore = 30;
    } else {
      sectorScore = 5; // farklı sektör ama mevcut
    }
  }

  // 2. Şehir yakınlığı (+20 max)
  if (candidate.city) {
    if (candidate.city === request.city) {
      cityScore = 20;
    } else if (areNeighborCities(candidate.city, request.city)) {
      cityScore = 10;
    }
  }

  // 3. İş deneyim tamamlayıcılığı (+30 max)
  const reqAmount = Number(request.requiredExperienceAmount);
  if (reqAmount > 0 && candidateStats.totalExperience > 0) {
    const ratio = candidateStats.totalExperience / reqAmount;
    if (ratio >= 1) {
      experienceScore = 30;
    } else if (ratio >= 0.5) {
      experienceScore = Math.round(ratio * 30);
    } else {
      experienceScore = Math.round(ratio * 20);
    }
  }

  // 4. Geçmiş başarı oranı (+20 max)
  if (candidateStats.totalBids > 0) {
    const winRate = candidateStats.wonTenders / candidateStats.totalBids;
    successScore = Math.round(winRate * 20);
  } else if (candidate.foundedYear) {
    // Firma deneyim yılına göre bonus
    const years = new Date().getFullYear() - candidate.foundedYear;
    successScore = Math.min(years * 2, 10);
  }

  return {
    companyId: candidate.id,
    companyName: candidate.name,
    totalScore: sectorScore + cityScore + experienceScore + successScore,
    breakdown: { sectorScore, cityScore, experienceScore, successScore },
  };
}

// ─── JV REQUEST CRUD ────────────────────────────────────────

export async function createJvRequest(data: {
  companyId: string;
  tenderId?: string;
  title: string;
  description: string;
  requiredSpecialty: string;
  requiredExperienceAmount: number;
  city: string;
}) {
  return prisma.jvRequest.create({
    data: {
      ...data,
      requiredExperienceAmount: data.requiredExperienceAmount,
    },
    include: { company: true, tender: true },
  });
}

export async function getJvRequests(filters?: {
  status?: JvRequestStatus;
  city?: string;
  specialty?: string;
}) {
  const where: Record<string, unknown> = {};
  if (filters?.status) where.status = filters.status;
  if (filters?.city) where.city = filters.city;
  if (filters?.specialty) where.requiredSpecialty = filters.specialty;

  return prisma.jvRequest.findMany({
    where,
    include: {
      company: { select: { id: true, name: true, city: true, sector: true } },
      tender: { select: { id: true, title: true, deadline: true, estimatedCost: true } },
      _count: { select: { matches: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getJvRequestById(id: string) {
  return prisma.jvRequest.findUnique({
    where: { id },
    include: {
      company: true,
      tender: true,
      matches: {
        include: {
          matchedCompany: {
            select: { id: true, name: true, city: true, sector: true, description: true, foundedYear: true, employeeCount: true },
          },
        },
        orderBy: { compatibilityScore: "desc" },
      },
      agreement: {
        include: {
          parties: {
            include: { company: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });
}

export async function updateJvRequestStatus(id: string, status: JvRequestStatus) {
  return prisma.jvRequest.update({ where: { id }, data: { status } });
}

export async function deleteJvRequest(id: string) {
  return prisma.jvRequest.delete({ where: { id } });
}

// ─── AI EŞLEŞTİRME ─────────────────────────────────────────

export async function findMatches(requestId: string) {
  const request = await prisma.jvRequest.findUnique({
    where: { id: requestId },
    include: { company: true },
  });
  if (!request) throw new Error("İlan bulunamadı");

  // Kendi firması hariç tüm firmaları al
  const candidates = await prisma.company.findMany({
    where: { id: { not: request.companyId } },
  });

  const scores: MatchScore[] = [];

  for (const candidate of candidates) {
    // Firma istatistikleri
    const [wonTenders, totalBids, completedContracts] = await Promise.all([
      prisma.bid.count({
        where: {
          companyId: candidate.id,
          status: "TAMAMLANDI",
        },
      }),
      prisma.bid.count({ where: { companyId: candidate.id } }),
      prisma.contract?.count({
        where: {
          userId: { in: await prisma.user.findMany({ where: { companyId: candidate.id }, select: { id: true } }).then(u => u.map(x => x.id)) },
          status: "TAMAMLANDI",
        },
      }).catch(() => 0) ?? 0,
    ]);

    // Toplam iş deneyim tutarı (tamamlanan sözleşmelerden)
    const totalExperience = Number(completedContracts) * Number(request.requiredExperienceAmount) * 0.3;

    const score = calculateCompatibility(
      {
        requiredSpecialty: request.requiredSpecialty,
        city: request.city,
        requiredExperienceAmount: Number(request.requiredExperienceAmount),
      },
      candidate as CompanyProfile,
      { wonTenders, totalBids, totalExperience }
    );

    if (score.totalScore > 10) {
      scores.push(score);
    }
  }

  // Skora göre sırala ve top 20 al
  scores.sort((a, b) => b.totalScore - a.totalScore);
  const topMatches = scores.slice(0, 20);

  // Mevcut eşleşmeleri sil ve yeniden oluştur
  await prisma.jvMatch.deleteMany({ where: { requestId } });

  const created = await Promise.all(
    topMatches.map((m) =>
      prisma.jvMatch.create({
        data: {
          requestId,
          matchedCompanyId: m.companyId,
          compatibilityScore: m.totalScore,
          message: `Sektör: ${m.breakdown.sectorScore}/30 | Şehir: ${m.breakdown.cityScore}/20 | Deneyim: ${m.breakdown.experienceScore}/30 | Başarı: ${m.breakdown.successScore}/20`,
        },
        include: {
          matchedCompany: {
            select: { id: true, name: true, city: true, sector: true, description: true, foundedYear: true, employeeCount: true },
          },
        },
      })
    )
  );

  // İlan durumunu MATCHED yap (eşleşme bulunduysa)
  if (created.length > 0) {
    await prisma.jvRequest.update({
      where: { id: requestId },
      data: { status: "MATCHED" },
    });
  }

  return created;
}

// ─── MATCH CRUD ─────────────────────────────────────────────

export async function updateMatchStatus(matchId: string, status: JvMatchStatus, message?: string) {
  return prisma.jvMatch.update({
    where: { id: matchId },
    data: { status, ...(message && { message }) },
    include: {
      matchedCompany: {
        select: { id: true, name: true, city: true, sector: true },
      },
    },
  });
}

// ─── ANLAŞMA (AGREEMENT) ───────────────────────────────────

const NDA_TEMPLATE = {
  title: "İş Ortaklığı Gizlilik Sözleşmesi (NDA)",
  version: "1.0",
  sections: [
    {
      heading: "1. Taraflar",
      content: "İşbu gizlilik sözleşmesi, aşağıda bilgileri yer alan taraflar arasında akdedilmiştir.",
    },
    {
      heading: "2. Gizli Bilgi Tanımı",
      content: "Tarafların birbirine açıkladığı her türlü ticari, mali, teknik bilgi gizli bilgi olarak kabul edilir.",
    },
    {
      heading: "3. Gizlilik Yükümlülüğü",
      content: "Taraflar, gizli bilgileri üçüncü kişilerle paylaşmamayı ve yalnızca iş ortaklığı amacıyla kullanmayı taahhüt eder.",
    },
    {
      heading: "4. Süre",
      content: "İşbu sözleşme imza tarihinden itibaren 2 (iki) yıl süreyle geçerlidir.",
    },
    {
      heading: "5. İhlal ve Yaptırımlar",
      content: "Gizlilik yükümlülüğünü ihlal eden taraf, diğer tarafın uğradığı tüm zararları tazmin etmekle yükümlüdür.",
    },
  ],
};

export async function createAgreement(data: {
  requestId: string;
  agreementType: string;
  partyCompanyIds: string[];
  partyRoles?: Record<string, string>;
  partyShares?: Record<string, number>;
}) {
  return prisma.jvAgreement.create({
    data: {
      requestId: data.requestId,
      agreementType: data.agreementType,
      terms: JSON.parse(JSON.stringify(NDA_TEMPLATE)),
      parties: {
        create: data.partyCompanyIds.map((cid) => ({
          companyId: cid,
          role: data.partyRoles?.[cid] || "OZEL_ORTAK",
          sharePercent: data.partyShares?.[cid] || (100 / data.partyCompanyIds.length),
        })),
      },
    },
    include: {
      parties: {
        include: { company: { select: { id: true, name: true } } },
      },
    },
  });
}

export async function signNda(agreementId: string) {
  return prisma.jvAgreement.update({
    where: { id: agreementId },
    data: { ndaSignedAt: new Date() },
  });
}

export async function getAgreement(requestId: string) {
  return prisma.jvAgreement.findUnique({
    where: { requestId },
    include: {
      parties: {
        include: { company: { select: { id: true, name: true } } },
      },
      request: {
        include: {
          company: { select: { id: true, name: true } },
          tender: { select: { id: true, title: true } },
        },
      },
    },
  });
}

// ─── İSTATİSTİKLER ──────────────────────────────────────────

export async function getJvStats(companyId?: string) {
  const where = companyId ? { companyId } : {};

  const [totalRequests, openRequests, matchedRequests, totalMatches, acceptedMatches] =
    await Promise.all([
      prisma.jvRequest.count({ where }),
      prisma.jvRequest.count({ where: { ...where, status: "OPEN" } }),
      prisma.jvRequest.count({ where: { ...where, status: "MATCHED" } }),
      prisma.jvMatch.count({
        where: companyId
          ? { OR: [{ request: { companyId } }, { matchedCompanyId: companyId }] }
          : {},
      }),
      prisma.jvMatch.count({
        where: {
          status: "ACCEPTED",
          ...(companyId
            ? { OR: [{ request: { companyId } }, { matchedCompanyId: companyId }] }
            : {}),
        },
      }),
    ]);

  return { totalRequests, openRequests, matchedRequests, totalMatches, acceptedMatches };
}

// Sektör listesi
export const SPECIALTIES = [
  { value: "YAPIM", label: "Yapım İşleri" },
  { value: "MAL_ALIMI", label: "Mal Alımı" },
  { value: "HIZMET", label: "Hizmet Alımı" },
  { value: "DANISMANLIK", label: "Danışmanlık" },
];

// Şehir listesi (büyük iller)
export const CITIES = [
  "İstanbul", "Ankara", "İzmir", "Bursa", "Antalya", "Adana", "Konya",
  "Gaziantep", "Kayseri", "Trabzon", "Mersin", "Kocaeli", "Eskişehir",
  "Diyarbakır", "Samsun", "Denizli", "Malatya", "Erzurum", "Van",
  "Manisa", "Balıkesir", "Aydın", "Muğla", "Şanlıurfa", "Hatay",
  "Kahramanmaraş", "Sakarya", "Tekirdağ", "Ordu", "Sivas",
];
