/**
 * Birim Fiyat Benchmark Motoru
 * Sektöre göre birim fiyat piyasa karşılaştırması
 */

export interface BenchmarkResult {
  itemName: string;
  unit: string;
  yourPrice: number;
  marketAvg: number;
  marketMin: number;
  marketMax: number;
  marketMedian: number;
  status: "competitive" | "above_avg" | "below_avg" | "risky_low";
  statusLabel: string;
  deviation: number; // % from average
  suggestion: string;
}

// Simulated market benchmark data (in production, fetched from BenchmarkData table)
const BENCHMARK_DB: Record<string, Record<string, { avg: number; min: number; max: number; median: number }>> = {
  "Yapım İşleri": {
    "m³": { avg: 950, min: 720, max: 1280, median: 920 },
    "m²": { avg: 320, min: 210, max: 480, median: 300 },
    "ton": { avg: 14500, min: 11000, max: 19000, median: 14000 },
    "kg": { avg: 18, min: 12, max: 28, median: 17 },
    "metre": { avg: 85, min: 55, max: 130, median: 80 },
    "takım": { avg: 45000, min: 28000, max: 75000, median: 42000 },
    "adet": { avg: 2500, min: 800, max: 5500, median: 2200 },
    "gün": { avg: 3500, min: 2000, max: 6000, median: 3200 },
    "kalem": { avg: 125000, min: 50000, max: 350000, median: 110000 },
  },
  "Hizmet Alımı": {
    "ay": { avg: 85000, min: 45000, max: 150000, median: 78000 },
    "adet": { avg: 1500, min: 500, max: 3500, median: 1300 },
    "saat": { avg: 450, min: 250, max: 800, median: 400 },
    "gün": { avg: 3200, min: 1800, max: 5500, median: 3000 },
    "kalem": { avg: 95000, min: 30000, max: 250000, median: 85000 },
    "takım": { avg: 35000, min: 18000, max: 65000, median: 32000 },
  },
  "Mal Alımı": {
    "adet": { avg: 8500, min: 2000, max: 25000, median: 7000 },
    "takım": { avg: 55000, min: 20000, max: 120000, median: 48000 },
    "kg": { avg: 45, min: 20, max: 85, median: 40 },
    "ton": { avg: 32000, min: 18000, max: 55000, median: 29000 },
    "kalem": { avg: 180000, min: 50000, max: 500000, median: 150000 },
    "set": { avg: 75000, min: 30000, max: 150000, median: 65000 },
  },
  "Danışmanlık": {
    "ay": { avg: 120000, min: 65000, max: 220000, median: 110000 },
    "saat": { avg: 750, min: 400, max: 1500, median: 680 },
    "gün": { avg: 5500, min: 3000, max: 10000, median: 5000 },
    "kalem": { avg: 250000, min: 80000, max: 600000, median: 220000 },
    "adet": { avg: 15000, min: 5000, max: 40000, median: 13000 },
  },
};

const SECTOR_MAP: Record<string, string> = {
  YAPIM: "Yapım İşleri",
  HIZMET: "Hizmet Alımı",
  MAL_ALIMI: "Mal Alımı",
  DANISMANLIK: "Danışmanlık",
};

export function analyzeBenchmark(
  items: { description: string; unit: string; unitPrice: number; quantity: number }[],
  tenderType: string
): BenchmarkResult[] {
  const sector = SECTOR_MAP[tenderType] || "Yapım İşleri";
  const sectorBenchmarks = BENCHMARK_DB[sector] || BENCHMARK_DB["Yapım İşleri"];

  return items.map((item) => {
    const benchmark = sectorBenchmarks[item.unit];

    if (!benchmark) {
      // No benchmark data for this unit
      return {
        itemName: item.description,
        unit: item.unit,
        yourPrice: item.unitPrice,
        marketAvg: 0,
        marketMin: 0,
        marketMax: 0,
        marketMedian: 0,
        status: "competitive" as const,
        statusLabel: "Veri yok",
        deviation: 0,
        suggestion: "Bu birim için piyasa verisi bulunmamaktadır.",
      };
    }

    const deviation = ((item.unitPrice - benchmark.avg) / benchmark.avg) * 100;

    let status: BenchmarkResult["status"];
    let statusLabel: string;
    let suggestion: string;

    if (item.unitPrice < benchmark.min * 0.85) {
      status = "risky_low";
      statusLabel = "Riskli Düşük";
      suggestion = `Birim fiyatınız (${item.unitPrice.toLocaleString("tr-TR")} ₺) piyasa minimumunun (%${Math.abs(Math.round(((item.unitPrice - benchmark.min) / benchmark.min) * 100))}) altında. Aşırı düşük sorgulamasına dikkat!`;
    } else if (item.unitPrice < benchmark.avg * 0.9) {
      status = "competitive";
      statusLabel = "Rekabetçi";
      suggestion = `Fiyatınız piyasa ortalamasının %${Math.abs(Math.round(deviation))} altında — rekabetçi konumdasınız.`;
    } else if (item.unitPrice <= benchmark.avg * 1.1) {
      status = "competitive";
      statusLabel = "Uygun";
      suggestion = `Fiyatınız piyasa ortalamasına yakın — kabul edilebilir seviyede.`;
    } else if (item.unitPrice <= benchmark.max) {
      status = "above_avg";
      statusLabel = "Ortalamanın Üstü";
      suggestion = `Fiyatınız ortalamanın %${Math.round(deviation)} üzerinde. Rekabetçilik için ${Math.round(benchmark.avg * 0.95).toLocaleString("tr-TR")} — ${Math.round(benchmark.avg * 1.05).toLocaleString("tr-TR")} ₺ aralığını değerlendirin.`;
    } else {
      status = "above_avg";
      statusLabel = "Yüksek";
      suggestion = `Fiyatınız piyasa üst sınırını aşıyor. Düşürmeniz önerilir.`;
    }

    return {
      itemName: item.description,
      unit: item.unit,
      yourPrice: item.unitPrice,
      marketAvg: benchmark.avg,
      marketMin: benchmark.min,
      marketMax: benchmark.max,
      marketMedian: benchmark.median,
      status,
      statusLabel,
      deviation: Math.round(deviation * 10) / 10,
      suggestion,
    };
  });
}
