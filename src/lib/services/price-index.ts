// ─── Fiyat Endeksi Servisi ───────────────────────────────────

import { prisma } from "@/lib/prisma";

// ─── Types ──────────────────────────────────────────────────

export interface PriceTrend {
  code: string;
  name: string;
  unit: string;
  currentPrice: number;
  previousPrice: number | null;
  changePercent: number | null;
  history: { period: string; price: number }[];
}

export interface RegionalCompare {
  item: string;
  itemLabel: string;
  unit: string;
  regions: { city: string; avgPrice: number; minPrice: number; maxPrice: number }[];
  nationalAvg: number;
}

export interface PriceEscalation {
  baseMonth: string;
  currentMonth: string;
  indexCode: string;
  baseValue: number;
  currentValue: number;
  escalationRate: number; // (Pn1/Pn0 - 1) as percentage
}

export interface PriceForecast {
  code: string;
  name: string;
  currentPrice: number;
  forecastPrice: number;
  forecastMonth: string;
  method: string;
  confidence: number;
}

// ─── Malzeme Bazlı Fiyat Trendi (Son 12 Ay) ────────────────

export async function getMaterialTrend(
  itemCode: string,
  months: number = 12,
): Promise<PriceTrend | null> {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);

  const records = await prisma.unitPriceIndex.findMany({
    where: { item: itemCode, month: { gte: cutoff } },
    orderBy: { month: "asc" },
  });

  if (records.length === 0) return null;

  const latest = records[records.length - 1];
  const prev = records.length > 1 ? records[records.length - 2] : null;
  const changePercent = prev
    ? ((Number(latest.avgPrice) - Number(prev.avgPrice)) / Number(prev.avgPrice)) * 100
    : null;

  return {
    code: latest.item,
    name: latest.itemLabel,
    unit: latest.unit,
    currentPrice: Number(latest.avgPrice),
    previousPrice: prev ? Number(prev.avgPrice) : null,
    changePercent: changePercent ? Math.round(changePercent * 100) / 100 : null,
    history: records.map((r) => ({
      period: r.month.toISOString().slice(0, 7),
      price: Number(r.avgPrice),
    })),
  };
}

// ─── Bölgesel Karşılaştırma (81 İl) ────────────────────────

export async function getRegionalPrices(
  itemCode: string,
): Promise<RegionalCompare | null> {
  // Get latest month's data for this item across cities
  const latest = await prisma.unitPriceIndex.findFirst({
    where: { item: itemCode },
    orderBy: { month: "desc" },
    select: { month: true },
  });

  if (!latest) return null;

  const records = await prisma.unitPriceIndex.findMany({
    where: { item: itemCode, month: latest.month, city: { not: null } },
    orderBy: { city: "asc" },
  });

  if (records.length === 0) return null;

  const first = records[0];
  const regions = records.map((r) => ({
    city: r.city || "Bilinmiyor",
    avgPrice: Number(r.avgPrice),
    minPrice: Number(r.minPrice),
    maxPrice: Number(r.maxPrice),
  }));

  const nationalAvg =
    regions.reduce((s, r) => s + r.avgPrice, 0) / regions.length;

  return {
    item: first.item,
    itemLabel: first.itemLabel,
    unit: first.unit,
    regions,
    nationalAvg: Math.round(nationalAvg * 100) / 100,
  };
}

// ─── Yıllık Değişim Oranı ──────────────────────────────────

export async function getYearlyChange(
  itemCode: string,
): Promise<{ change: number; currentYear: number; previousYear: number } | null> {
  const now = new Date();
  const thisYear = now.getFullYear();
  const lastYear = thisYear - 1;

  const [current, previous] = await Promise.all([
    prisma.ministryUnitPrice.findFirst({
      where: { code: itemCode, year: thisYear },
      orderBy: { month: "desc" },
    }),
    prisma.ministryUnitPrice.findFirst({
      where: { code: itemCode, year: lastYear },
      orderBy: { month: "desc" },
    }),
  ]);

  if (!current || !previous) return null;

  const change =
    ((Number(current.price) - Number(previous.price)) / Number(previous.price)) * 100;

  return {
    change: Math.round(change * 100) / 100,
    currentYear: thisYear,
    previousYear: lastYear,
  };
}

// ─── Fiyat Farkı Hesaplama (Yİ-ÜFE Endeks Oranı) ──────────

/**
 * 4734 sayılı Kamu İhale Kanunu fiyat farkı formülü:
 * F = An × B × (Pn - 1)
 * Pn = a1×(Tn1/Tn0) + a2×(Yn1/Yn0) + ... + b0
 * Basitleştirilmiş: Pn = Endeks(n1) / Endeks(n0)
 */
export async function calculatePriceEscalation(
  baseMonth: string,
  currentMonth: string,
  indexCode: string = "YIUFE",
): Promise<PriceEscalation | null> {
  const [base, current] = await Promise.all([
    prisma.macroPriceIndex.findUnique({
      where: { code_period: { code: indexCode, period: baseMonth } },
    }),
    prisma.macroPriceIndex.findUnique({
      where: { code_period: { code: indexCode, period: currentMonth } },
    }),
  ]);

  if (!base || !current) return null;

  const escalationRate = ((current.value / base.value) - 1) * 100;

  return {
    baseMonth,
    currentMonth,
    indexCode,
    baseValue: base.value,
    currentValue: current.value,
    escalationRate: Math.round(escalationRate * 100) / 100,
  };
}

// ─── Fiyat Tahmini (Hareketli Ortalama) ─────────────────────

export async function forecastPrice(
  itemCode: string,
  monthsAhead: number = 3,
): Promise<PriceForecast | null> {
  const records = await prisma.unitPriceIndex.findMany({
    where: { item: itemCode, city: null },
    orderBy: { month: "desc" },
    take: 12,
  });

  if (records.length < 3) return null;

  const prices = records.map((r) => Number(r.avgPrice)).reverse();

  // Simple weighted moving average (recent months weighted more)
  const windowSize = Math.min(6, prices.length);
  let weightedSum = 0;
  let weightTotal = 0;
  for (let i = 0; i < windowSize; i++) {
    const weight = i + 1;
    weightedSum += prices[prices.length - 1 - (windowSize - 1 - i)] * weight;
    weightTotal += weight;
  }

  const trend = prices.length >= 2
    ? (prices[prices.length - 1] - prices[prices.length - 2]) / prices[prices.length - 2]
    : 0;

  const basePrice = weightedSum / weightTotal;
  const forecastPrice = basePrice * (1 + trend * monthsAhead);

  const futureDate = new Date();
  futureDate.setMonth(futureDate.getMonth() + monthsAhead);

  return {
    code: records[0].item,
    name: records[0].itemLabel,
    currentPrice: Number(records[0].avgPrice),
    forecastPrice: Math.round(forecastPrice * 100) / 100,
    forecastMonth: futureDate.toISOString().slice(0, 7),
    method: "weighted_moving_average",
    confidence: Math.min(90, records.length * 8),
  };
}

// ─── Makro Endeks Karşılaştırma ─────────────────────────────

export async function getMacroIndices(
  months: number = 12,
): Promise<Record<string, { period: string; value: number }[]>> {
  const cutoffDate = `${new Date().getFullYear() - 1}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

  const indices = await prisma.macroPriceIndex.findMany({
    where: { period: { gte: cutoffDate } },
    orderBy: { period: "asc" },
    take: months * 5,
  });

  const grouped: Record<string, { period: string; value: number }[]> = {};
  for (const idx of indices) {
    if (!grouped[idx.code]) grouped[idx.code] = [];
    grouped[idx.code].push({ period: idx.period, value: idx.value });
  }

  return grouped;
}
