// Client-safe constants (no Prisma imports)

export const CATEGORY_LABELS: Record<string, string> = {
  KANUN: "Kanun",
  YONETMELIK: "Yönetmelik",
  TEBLIG: "Tebliğ",
  DUYURU: "Duyuru",
};

export const SOURCE_LABELS: Record<string, string> = {
  RESMI_GAZETE: "Resmî Gazete",
  KIK: "KİK",
  MEVZUAT_GOV: "mevzuat.gov.tr",
};

export const IMPACT_LABELS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  LOW: { label: "Düşük Etki", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
  MEDIUM: { label: "Orta Etki", color: "text-yellow-700", bg: "bg-yellow-50", border: "border-yellow-200" },
  HIGH: { label: "Yüksek Etki", color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" },
  CRITICAL: { label: "Kritik Etki", color: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
};

export const ALL_CATEGORIES = ["KANUN", "YONETMELIK", "TEBLIG", "DUYURU"];
export const ALL_IMPACT_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
