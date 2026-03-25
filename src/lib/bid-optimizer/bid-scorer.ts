/**
 * Teklif Skoru — AI her teklifi 0-100 arasında puanlar
 * Fiyat rekabetçiliği, geçmiş kazanma oranı, firma uyumu
 */

import type { BenchmarkResult } from "./benchmark-engine";
import type { WinProbabilityAnalysis } from "./win-probability";

export interface BidScore {
  overall: number; // 0-100
  breakdown: {
    priceCompetitiveness: number; // 0-30
    benchmarkAlignment: number;   // 0-25
    winProbability: number;       // 0-25
    completeness: number;         // 0-20
  };
  grade: "A" | "B" | "C" | "D" | "F";
  gradeLabel: string;
  recommendations: string[];
}

export function calculateBidScore(params: {
  totalAmount: number;
  estimatedCost: number;
  benchmarks: BenchmarkResult[];
  winAnalysis: WinProbabilityAnalysis;
  itemCount: number;
  hasLetter: boolean;
  hasCompanyInfo: boolean;
}): BidScore {
  const {
    totalAmount,
    estimatedCost,
    benchmarks,
    winAnalysis,
    itemCount,
    hasLetter,
    hasCompanyInfo,
  } = params;

  const recommendations: string[] = [];

  // 1. Price Competitiveness (0-30)
  const ratio = totalAmount / estimatedCost;
  let priceScore: number;

  if (ratio < 0.60) {
    priceScore = 5;
    recommendations.push("Teklif bedeli aşırı düşük — elenme riski yüksek");
  } else if (ratio < 0.70) {
    priceScore = 15;
    recommendations.push("Teklif bedeli çok düşük — aşırı düşük sorgulamasına hazır olun");
  } else if (ratio < 0.80) {
    priceScore = 25;
  } else if (ratio <= 0.90) {
    priceScore = 30; // Sweet spot
  } else if (ratio <= 1.0) {
    priceScore = 22;
    recommendations.push("Teklif tahmini bedele çok yakın — %5-15 indirim düşünün");
  } else {
    priceScore = Math.max(5, 20 - (ratio - 1.0) * 50);
    recommendations.push("Teklif tahmini bedeli aşıyor — kazanma şansı düşük");
  }

  // 2. Benchmark Alignment (0-25)
  const validBenchmarks = benchmarks.filter((b) => b.marketAvg > 0);
  let benchmarkScore = 15; // default if no data

  if (validBenchmarks.length > 0) {
    const competitiveCount = validBenchmarks.filter(
      (b) => b.status === "competitive"
    ).length;
    const riskyCount = validBenchmarks.filter(
      (b) => b.status === "risky_low"
    ).length;

    benchmarkScore = Math.round((competitiveCount / validBenchmarks.length) * 25);

    if (riskyCount > 0) {
      benchmarkScore = Math.max(5, benchmarkScore - riskyCount * 5);
      recommendations.push(
        `${riskyCount} kalemde birim fiyat piyasa minimumunun altında`
      );
    }

    const aboveAvgCount = validBenchmarks.filter(
      (b) => b.status === "above_avg"
    ).length;
    if (aboveAvgCount > validBenchmarks.length * 0.5) {
      recommendations.push("Birim fiyatlarının çoğu ortalamanın üstünde — fiyat optimizasyonu düşünün");
    }
  }

  // 3. Win Probability Score (0-25)
  // Find probability for current bid amount
  let closestProb = winAnalysis.curve[0];
  let minDiff = Math.abs(winAnalysis.curve[0].bidAmount - totalAmount);
  for (const point of winAnalysis.curve) {
    const diff = Math.abs(point.bidAmount - totalAmount);
    if (diff < minDiff) {
      minDiff = diff;
      closestProb = point;
    }
  }

  const winProbScore = Math.round((closestProb.probability / 100) * 25);

  if (closestProb.probability < 30) {
    recommendations.push("Mevcut fiyatla kazanma olasılığı düşük");
  }

  if (totalAmount < winAnalysis.asiriDusukSinir) {
    recommendations.push(
      `UYARI: Teklifiniz aşırı düşük sınırının (${(winAnalysis.asiriDusukSinir / 1_000_000).toFixed(2)}M ₺) altında!`
    );
  }

  // 4. Completeness (0-20)
  let completeness = 0;
  if (itemCount > 0) completeness += 8;
  if (itemCount >= 3) completeness += 4;
  if (hasLetter) completeness += 4;
  if (hasCompanyInfo) completeness += 4;

  if (!hasLetter) recommendations.push("Teklif mektubu eklenmemiş");
  if (!hasCompanyInfo) recommendations.push("Firma bilgileri eksik");
  if (itemCount === 0) recommendations.push("Maliyet kalemleri eklenmemiş");

  const overall = Math.min(100, Math.max(0, priceScore + benchmarkScore + winProbScore + completeness));

  const grade: BidScore["grade"] =
    overall >= 85 ? "A" :
    overall >= 70 ? "B" :
    overall >= 55 ? "C" :
    overall >= 40 ? "D" : "F";

  const gradeLabels = {
    A: "Mükemmel — Kazanma şansı yüksek",
    B: "İyi — Rekabetçi teklif",
    C: "Orta — İyileştirme gerekli",
    D: "Zayıf — Önemli düzeltmeler gerekli",
    F: "Yetersiz — Yeniden yapılandırın",
  };

  // Add positive recommendations
  if (overall >= 70 && recommendations.length === 0) {
    recommendations.push("Teklifiniz rekabetçi görünüyor — gönderime hazır");
  }

  return {
    overall,
    breakdown: {
      priceCompetitiveness: priceScore,
      benchmarkAlignment: benchmarkScore,
      winProbability: winProbScore,
      completeness,
    },
    grade,
    gradeLabel: gradeLabels[grade],
    recommendations,
  };
}
