/**
 * Maliyet Simülasyonu — KDV, nakliye, kâr marjı toggle'ları
 */

export interface SimulationParams {
  baseAmount: number;
  kdvIncluded: boolean;
  kdvRate: number; // default 20
  transportEnabled: boolean;
  transportCost: number;
  profitMarginEnabled: boolean;
  profitMarginPercent: number;
  discountEnabled: boolean;
  discountPercent: number;
  insuranceEnabled: boolean;
  insurancePercent: number;
}

export interface SimulationResult {
  baseAmount: number;
  kdvAmount: number;
  transportAmount: number;
  profitAmount: number;
  discountAmount: number;
  insuranceAmount: number;
  finalAmount: number;
  breakdown: { label: string; amount: number; type: "add" | "subtract" | "base" }[];
}

export function runSimulation(params: SimulationParams): SimulationResult {
  const {
    baseAmount,
    kdvIncluded,
    kdvRate,
    transportEnabled,
    transportCost,
    profitMarginEnabled,
    profitMarginPercent,
    discountEnabled,
    discountPercent,
    insuranceEnabled,
    insurancePercent,
  } = params;

  const breakdown: SimulationResult["breakdown"] = [
    { label: "Teklif Bedeli (KDV Hariç)", amount: baseAmount, type: "base" },
  ];

  let running = baseAmount;

  // Discount
  let discountAmount = 0;
  if (discountEnabled && discountPercent > 0) {
    discountAmount = Math.round(baseAmount * (discountPercent / 100));
    running -= discountAmount;
    breakdown.push({ label: `İskonto (%${discountPercent})`, amount: -discountAmount, type: "subtract" });
  }

  // Transport
  let transportAmount = 0;
  if (transportEnabled && transportCost > 0) {
    transportAmount = transportCost;
    running += transportAmount;
    breakdown.push({ label: "Nakliye Bedeli", amount: transportAmount, type: "add" });
  }

  // Insurance
  let insuranceAmount = 0;
  if (insuranceEnabled && insurancePercent > 0) {
    insuranceAmount = Math.round(baseAmount * (insurancePercent / 100));
    running += insuranceAmount;
    breakdown.push({ label: `Sigorta (%${insurancePercent})`, amount: insuranceAmount, type: "add" });
  }

  // Profit margin
  let profitAmount = 0;
  if (profitMarginEnabled && profitMarginPercent > 0) {
    profitAmount = Math.round(running * (profitMarginPercent / 100));
    running += profitAmount;
    breakdown.push({ label: `Kâr Marjı (%${profitMarginPercent})`, amount: profitAmount, type: "add" });
  }

  // KDV
  let kdvAmount = 0;
  if (kdvIncluded) {
    kdvAmount = Math.round(running * (kdvRate / 100));
    running += kdvAmount;
    breakdown.push({ label: `KDV (%${kdvRate})`, amount: kdvAmount, type: "add" });
  }

  return {
    baseAmount,
    kdvAmount,
    transportAmount,
    profitAmount,
    discountAmount,
    insuranceAmount,
    finalAmount: running,
    breakdown,
  };
}

export const DEFAULT_PARAMS: SimulationParams = {
  baseAmount: 0,
  kdvIncluded: false,
  kdvRate: 20,
  transportEnabled: false,
  transportCost: 0,
  profitMarginEnabled: false,
  profitMarginPercent: 5,
  discountEnabled: false,
  discountPercent: 0,
  insuranceEnabled: false,
  insurancePercent: 2,
};
