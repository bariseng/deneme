// Client-safe constants (no Prisma imports)

export const EVENT_TYPE_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  SON_BASVURU: { label: "Son Başvuru", color: "#ef4444", bgColor: "#fef2f2" },
  SORU_TARIHI: { label: "Soru Tarihi", color: "#3b82f6", bgColor: "#eff6ff" },
  ACIKLAMA: { label: "Açıklama", color: "#22c55e", bgColor: "#f0fdf4" },
  ZEYILNAME: { label: "Zeyilname", color: "#f59e0b", bgColor: "#fffbeb" },
  OZEL: { label: "Özel", color: "#8b5cf6", bgColor: "#f5f3ff" },
};

export const EVENT_TYPES = [
  { value: "SON_BASVURU", label: "Son Başvuru" },
  { value: "SORU_TARIHI", label: "Soru Tarihi" },
  { value: "ACIKLAMA", label: "Açıklama" },
  { value: "ZEYILNAME", label: "Zeyilname" },
  { value: "OZEL", label: "Özel" },
];

export const CHANNEL_LABELS: Record<string, string> = {
  PUSH: "Push Bildirim",
  EMAIL: "E-posta",
  IN_APP: "Uygulama İçi",
};

export function formatDateTR(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatDateTimeTR(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString("tr-TR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function daysUntil(date: string | Date): number {
  return Math.max(0, Math.ceil((new Date(date).getTime() - Date.now()) / 86400000));
}
