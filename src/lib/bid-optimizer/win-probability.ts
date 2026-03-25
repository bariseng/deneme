/**
 * Kazanma Olasılığı Hesaplayıcı
 * Farklı fiyat noktalarında kazanma olasılığı eğrisi oluşturur
 */

export interface ProbabilityPoint {
  bidAmount: number;
  probability: number; // 0-100
  label: string;
}

export interface WinProbabilityAnalysis {
  estimatedBudget: number;
  curve: ProbabilityPoint[];
  optimalPoint: ProbabilityPoint;
  historicalData: {
    avgWinningRatio: number; // percentage of estimate
    medianWinningRatio: number;
    sampleCount: number;
    lowestWinRatio: number;
    highestWinRatio: number;
  };
  competitorEstimate: number;
  asiriDusukSinir: number;
}

export interface HistoricalWin {
  winningPrice: number;
  estimatedCost: number;
  bidCount: number;
  ratio: number; // winningPrice / estimatedCost
}

function simulateHistoricalData(
  estimatedCost: number,
  tenderType: string
): HistoricalWin[] {
  // Simulate 15-25 past similar tenders
  const count = 15 + Math.floor(Math.random() * 11);
  const results: HistoricalWin[] = [];

  // Different sectors have different typical win ratios
  const baseRatio = tenderType === "YAPIM" ? 0.78
    : tenderType === "HIZMET" ? 0.82
    : tenderType === "MAL_ALIMI" ? 0.85
    : 0.80;

  for (let i = 0; i < count; i++) {
    const seed = Math.sin(i * 12.9898 + estimatedCost * 0.0001) * 43758.5453;
    const r = seed - Math.floor(seed);

    const variance = (r - 0.5) * 0.2; // ±10%
    const ratio = baseRatio + variance;
    const bidCount = 3 + Math.floor(r * 10);
    const winPrice = Math.round(estimatedCost * ratio);

    results.push({
      winningPrice: winPrice,
      estimatedCost,
      bidCount,
      ratio,
    });
  }

  return results.sort((a, b) => a.ratio - b.ratio);
}

export function calculateWinProbability(
  estimatedCost: number,
  tenderType: string,
  competitorCount: number
): WinProbabilityAnalysis {
  const historical = simulateHistoricalData(estimatedCost, tenderType);

  const ratios = historical.map((h) => h.ratio);
  const avgRatio = ratios.reduce((s, r) => s + r, 0) / ratios.length;
  const sortedRatios = [...ratios].sort((a, b) => a - b);
  const medianRatio = sortedRatios[Math.floor(sortedRatios.length / 2)];

  // KİK aşırı düşük sınırı (simplified: average of bottom 20% offers * 0.9)
  const bottomRatios = sortedRatios.slice(0, Math.ceil(sortedRatios.length * 0.2));
  const asiriDusukRatio = (bottomRatios.reduce((s, r) => s + r, 0) / bottomRatios.length) * 0.9;
  const asiriDusukSinir = Math.round(estimatedCost * asiriDusukRatio);

  // Generate probability curve: 10 price points from 60% to 100% of estimated cost
  const curve: ProbabilityPoint[] = [];
  const steps = 10;

  for (let i = 0; i <= steps; i++) {
    const ratio = 0.60 + (i / steps) * 0.40; // 60% to 100% of estimate
    const bidAmount = Math.round(estimatedCost * ratio);

    // Probability model: based on where bid falls relative to historical distribution
    // Lower bid → higher probability, but penalized if below aşırı düşük
    let probability: number;

    if (ratio < asiriDusukRatio) {
      // Below aşırı düşük → very low (eliminated risk)
      probability = 5 + Math.random() * 10;
    } else if (ratio <= medianRatio * 0.95) {
      // Aggressive but above aşırı düşük → high probability
      probability = 70 + (1 - (ratio - asiriDusukRatio) / (medianRatio - asiriDusukRatio)) * 20;
    } else if (ratio <= avgRatio) {
      // Around average → moderate-high
      probability = 50 + (1 - (ratio - medianRatio * 0.95) / (avgRatio - medianRatio * 0.95)) * 20;
    } else if (ratio <= avgRatio * 1.1) {
      // Slightly above average → moderate
      probability = 30 + (1 - (ratio - avgRatio) / (avgRatio * 0.1)) * 20;
    } else {
      // Well above average → low
      probability = Math.max(5, 30 - (ratio - avgRatio * 1.1) * 100);
    }

    // Adjust for competition
    const competitorFactor = competitorCount > 10 ? 0.7 : competitorCount > 5 ? 0.85 : 1.0;
    probability = Math.min(95, Math.max(3, probability * competitorFactor));
    probability = Math.round(probability);

    const pctLabel = Math.round(ratio * 100);
    curve.push({
      bidAmount,
      probability,
      label: `%${pctLabel} (${(bidAmount / 1_000_000).toFixed(2)}M ₺)`,
    });
  }

  // Find optimal point (highest probability × reasonable margin)
  const scored = curve.map((p) => ({
    ...p,
    // Score = probability weighted by a slight preference for higher amounts (more margin)
    score: p.probability * 0.85 + (p.bidAmount / estimatedCost) * 15,
  }));
  const optimalPoint = scored.reduce((best, p) => p.score > best.score ? p : best, scored[0]);

  return {
    estimatedBudget: estimatedCost,
    curve,
    optimalPoint: {
      bidAmount: optimalPoint.bidAmount,
      probability: optimalPoint.probability,
      label: optimalPoint.label,
    },
    historicalData: {
      avgWinningRatio: Math.round(avgRatio * 1000) / 10,
      medianWinningRatio: Math.round(medianRatio * 1000) / 10,
      sampleCount: historical.length,
      lowestWinRatio: Math.round(sortedRatios[0] * 1000) / 10,
      highestWinRatio: Math.round(sortedRatios[sortedRatios.length - 1] * 1000) / 10,
    },
    competitorEstimate: competitorCount,
    asiriDusukSinir,
  };
}
