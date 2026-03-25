// Client-safe constants (no Prisma imports)

export const EXCHANGE_RATES: Record<string, number> = {
  USD: 38.50, EUR: 41.20, GBP: 48.90, GEL: 13.50, AZN: 22.65,
  KZT: 0.078, QAR: 10.58, SAR: 10.27, LYD: 7.92, TMT: 11.00,
  RUB: 0.42, AED: 10.48,
};

export function convertToTRY(amount: number, currency: string): number {
  return amount * (EXCHANGE_RATES[currency] || 1);
}

export function formatCurrency(amount: number, currency: string): string {
  if (currency === "TRY") return `${amount.toLocaleString("tr-TR")} ₺`;
  const symbols: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", SAR: "﷼", QAR: "﷼" };
  return `${symbols[currency] || currency} ${amount.toLocaleString("en-US")}`;
}

export function formatBudget(amount: number): string {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return amount.toLocaleString("en-US");
}

export const SECTORS = [
  { value: "YAPIM", label: "Yapım İşleri" },
  { value: "HIZMET", label: "Hizmet Alımı" },
  { value: "MAL_ALIMI", label: "Mal Alımı" },
  { value: "DANISMANLIK", label: "Danışmanlık" },
];

export const RISK_INDICATOR_LABELS: Record<string, string> = {
  political_stability: "Siyasi İstikrar",
  payment_risk: "Ödeme Riski",
  currency_risk: "Kur Riski",
  legal_risk: "Hukuki Risk",
  security_risk: "Güvenlik Riski",
};

export function getRiskColor(score: number) {
  if (score >= 75) return { text: "text-green-600", bg: "bg-green-100", label: "Düşük Risk" };
  if (score >= 55) return { text: "text-yellow-600", bg: "bg-yellow-100", label: "Orta Risk" };
  if (score >= 35) return { text: "text-orange-600", bg: "bg-orange-100", label: "Yüksek Risk" };
  return { text: "text-red-600", bg: "bg-red-100", label: "Çok Yüksek Risk" };
}

export function getIndicatorColor(value: number, inverted: boolean = false) {
  // For inverted indicators (payment_risk, currency_risk, etc), lower is better
  const score = inverted ? 100 - value : value;
  if (score >= 70) return "text-green-600";
  if (score >= 50) return "text-yellow-600";
  if (score >= 30) return "text-orange-600";
  return "text-red-600";
}
