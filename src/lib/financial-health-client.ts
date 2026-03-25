// Client-safe constants and functions (no Prisma imports)

export interface Subscores {
  tenderHistory: number;
  paymentHistory: number;
  debtRatio: number;
  capacityScore: number;
  sectorExperience: number;
}

export function getRiskColor(level: string) {
  switch (level) {
    case "LOW": return { bg: "bg-green-100", text: "text-green-700", border: "border-green-300", label: "Düşük Risk" };
    case "MEDIUM": return { bg: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-300", label: "Orta Risk" };
    case "HIGH": return { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-300", label: "Yüksek Risk" };
    case "CRITICAL": return { bg: "bg-red-100", text: "text-red-700", border: "border-red-300", label: "Kritik Risk" };
    default: return { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-300", label: "Bilinmiyor" };
  }
}

export function getRecommendations(subscores: Record<string, number>): string[] {
  const recs: string[] = [];

  if ((subscores.tenderHistory ?? 100) < 60) {
    recs.push("İhale kazanma oranınızı artırmak için daha uygun ihalelere başvurun.");
  }
  if ((subscores.paymentHistory ?? 100) < 70) {
    recs.push("Zamanında teslim oranınızı iyileştirmek için proje yönetim süreçlerinizi gözden geçirin.");
  }
  if ((subscores.debtRatio ?? 100) < 60) {
    recs.push("SGK ve/veya vergi borçlarınızı temizlemek skor artışı sağlayacaktır.");
  }
  if ((subscores.capacityScore ?? 100) < 60) {
    recs.push("Kapasite kullanımınız yüksek. Yeni ihalelere girmeden mevcut işleri tamamlayın.");
  }
  if ((subscores.sectorExperience ?? 100) < 50) {
    recs.push("Farklı sektörlerde deneyim kazanarak deneyim puanınızı artırabilirsiniz.");
  }

  if (recs.length === 0) {
    recs.push("Mali sağlık durumunuz iyi seviyede. Mevcut performansınızı koruyun.");
  }

  return recs;
}

export const SUBSCORE_LABELS: Record<string, { label: string; weight: string }> = {
  tenderHistory: { label: "İhale Kazanma Geçmişi", weight: "%25" },
  paymentHistory: { label: "Ödeme & Teslim Geçmişi", weight: "%20" },
  debtRatio: { label: "Borç Durumu (SGK/Vergi)", weight: "%20" },
  capacityScore: { label: "Kapasite Kullanımı", weight: "%20" },
  sectorExperience: { label: "Sektör Deneyimi", weight: "%15" },
};

export function formatTRY(val: number) {
  return val.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
