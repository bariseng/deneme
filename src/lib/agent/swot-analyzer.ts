/**
 * SWOT Analizi — İhale katılım kararı için strateji asistanı
 * "Bu ihaleye girmeliyim mi?" → SWOT formatında detaylı analiz
 */

import type { Tender, FirmProfile } from "@/generated/prisma/client";

export interface SWOTAnalysis {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
  overallScore: number; // 0-100
  recommendation: "kesinlikle_katıl" | "katıl" | "dikkatli_değerlendir" | "katılma";
  recommendationText: string;
  keyMetrics: {
    label: string;
    value: string;
    status: "positive" | "neutral" | "negative";
  }[];
}

export function generateSWOT(
  tender: Tender,
  profile: FirmProfile | null,
  competitorCount: number,
  pastWinRate: number
): SWOTAnalysis {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const opportunities: string[] = [];
  const threats: string[] = [];
  const keyMetrics: SWOTAnalysis["keyMetrics"] = [];

  const cost = tender.estimatedCost ? Number(tender.estimatedCost) : 0;
  const daysLeft = Math.ceil(
    (tender.deadline.getTime() - Date.now()) / 86400000
  );

  // ─── STRENGTHS ─────────────────────────────────────
  if (profile) {
    if (profile.cities.includes(tender.city)) {
      strengths.push(`${tender.city} ilinde faaliyet gösterilmesi — lojistik ve yerel bilgi avantajı`);
    }
    if (profile.preferredTypes.includes(tender.tenderType)) {
      strengths.push("İhale türü firma uzmanlık alanıyla uyumlu");
    }
    const maxBudget = Number(profile.maxBudget);
    if (cost > 0 && cost <= maxBudget) {
      strengths.push("İhale bütçesi firma kapasitesi dahilinde");
    }
    if (profile.experienceYears > 5) {
      strengths.push(`${profile.experienceYears} yıllık sektör deneyimi — yeterlilik avantajı`);
    }
    if (pastWinRate > 30) {
      strengths.push(`Geçmiş kazanma oranı %${pastWinRate} — başarılı track record`);
    }
  } else {
    strengths.push("İhale takip sistemine erişim — bilgi avantajı");
  }

  if (daysLeft > 21) {
    strengths.push(`Yeterli hazırlık süresi mevcut (${daysLeft} gün)`);
  }

  // ─── WEAKNESSES ────────────────────────────────────
  if (profile) {
    const maxBudget = Number(profile.maxBudget);
    if (cost > maxBudget) {
      weaknesses.push("İhale bütçesi firma kapasitesini aşıyor — finansal zorlama riski");
    }
    if (!profile.cities.includes(tender.city)) {
      weaknesses.push(`${tender.city} firmanın faaliyet bölgesi dışında — ek lojistik maliyet`);
    }
    if (profile.experienceYears < 3) {
      weaknesses.push("Sınırlı sektör deneyimi — yeterlilik kriterleri zorlu olabilir");
    }
  } else {
    weaknesses.push("Firma profili tanımlanmamış — kişiselleştirilmiş analiz yapılamıyor");
  }

  if (daysLeft < 7 && daysLeft > 0) {
    weaknesses.push(`Kısıtlı hazırlık süresi (${daysLeft} gün) — kaliteli teklif hazırlama zorluğu`);
  }

  // ─── OPPORTUNITIES ─────────────────────────────────
  if (competitorCount < 4) {
    opportunities.push(`Düşük rekabet ortamı (${competitorCount} başvuru) — kazanma olasılığı yüksek`);
  }

  if (cost > 50_000_000) {
    opportunities.push("Yüksek bütçeli ihale — kârlılık potansiyeli yüksek");
  }

  if (tender.tenderType === "YAPIM") {
    opportunities.push("Yapım sektörü yükselen trendde (+23%) — piyasa genişliyor");
  } else if (tender.tenderType === "HIZMET") {
    opportunities.push("Hizmet ihaleleri tekrarlayan gelir fırsatı sunuyor");
  }

  opportunities.push("İhale kazanımı referans portföyünü güçlendirecektir");

  if (tender.institution.includes("Bakanlık") || tender.institution.includes("Genel Müdürlüğü")) {
    opportunities.push("Merkezi idare ihalesi — ödeme güvencesi ve prestij");
  }

  // ─── THREATS ───────────────────────────────────────
  if (competitorCount > 7) {
    threats.push(`Yoğun rekabet (${competitorCount} başvuru) — fiyat baskısı bekleniyor`);
  }

  if (cost > 100_000_000) {
    threats.push("Büyük bütçeli ihalelerde teminat mektubu yükü yüksek");
  }

  threats.push("Aşırı düşük teklif sorgulamasına muhatap kalma riski");

  if (tender.tenderType === "YAPIM") {
    threats.push("Malzeme fiyat dalgalanmaları maliyet riskini artırabilir");
  }

  if (daysLeft <= 0) {
    threats.push("Son başvuru tarihi geçmiş — katılım mümkün değil");
  }

  // ─── OVERALL SCORE ─────────────────────────────────
  let score = 50;
  score += strengths.length * 7;
  score -= weaknesses.length * 8;
  score += opportunities.length * 5;
  score -= threats.length * 6;
  if (daysLeft <= 0) score = 5;
  score = Math.max(5, Math.min(95, score));

  const recommendation: SWOTAnalysis["recommendation"] =
    score >= 75
      ? "kesinlikle_katıl"
      : score >= 55
        ? "katıl"
        : score >= 35
          ? "dikkatli_değerlendir"
          : "katılma";

  const recommendationTexts = {
    kesinlikle_katıl: `Bu ihale firma profilinize oldukça uygun. ${daysLeft > 0 ? `${daysLeft} gün içinde başvuru yapmanız` : "Derhal harekete geçmeniz"} önerilir. Güçlü yönleriniz riskleri telafi edecek düzeyde.`,
    katıl: `Bu ihale genel olarak uygun görünüyor ancak bazı riskler mevcut. Detaylı maliyet analizi yaparak teklif hazırlamanız önerilir.`,
    dikkatli_değerlendir: `Bu ihalede dikkate alınması gereken önemli riskler bulunmaktadır. Katılım kararı vermeden önce zayıf yönleri ve tehditleri değerlendirin.`,
    katılma: `Mevcut koşullarda bu ihaleye katılım önerilmemektedir. Risk faktörleri avantajları aşmaktadır.`,
  };

  // Key metrics
  keyMetrics.push({
    label: "Uyumluluk Skoru",
    value: `%${score}`,
    status: score >= 60 ? "positive" : score >= 40 ? "neutral" : "negative",
  });
  keyMetrics.push({
    label: "Rekabet Durumu",
    value: `${competitorCount} başvuru`,
    status: competitorCount < 5 ? "positive" : competitorCount < 10 ? "neutral" : "negative",
  });
  keyMetrics.push({
    label: "Kalan Süre",
    value: daysLeft > 0 ? `${daysLeft} gün` : "Süre doldu",
    status: daysLeft > 14 ? "positive" : daysLeft > 5 ? "neutral" : "negative",
  });
  if (cost > 0) {
    const costM = cost / 1_000_000;
    keyMetrics.push({
      label: "Tahmini Bedel",
      value: costM >= 1 ? `${costM.toFixed(1)}M ₺` : `${(cost / 1000).toFixed(0)}K ₺`,
      status: profile && cost <= Number(profile.maxBudget) ? "positive" : "neutral",
    });
  }

  return {
    strengths,
    weaknesses,
    opportunities,
    threats,
    overallScore: score,
    recommendation,
    recommendationText: recommendationTexts[recommendation],
    keyMetrics,
  };
}
