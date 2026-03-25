"use client";

import { useState, useCallback } from "react";
import {
  Zap,
  TrendingUp,
  BarChart3,
  Calculator,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Info,
  Target,
  Gauge,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import {
  runSimulation,
  DEFAULT_PARAMS,
  type SimulationParams,
  type SimulationResult,
} from "@/lib/bid-optimizer/cost-simulator";
import type { CostLineItem } from "@/lib/bid-store";

interface BenchmarkResult {
  itemName: string;
  unit: string;
  yourPrice: number;
  marketAvg: number;
  marketMin: number;
  marketMax: number;
  marketMedian: number;
  status: "competitive" | "above_avg" | "below_avg" | "risky_low";
  statusLabel: string;
  deviation: number;
  suggestion: string;
}

interface ProbabilityPoint {
  bidAmount: number;
  probability: number;
  label: string;
}

interface WinAnalysis {
  estimatedBudget: number;
  curve: ProbabilityPoint[];
  optimalPoint: ProbabilityPoint;
  historicalData: {
    avgWinningRatio: number;
    medianWinningRatio: number;
    sampleCount: number;
    lowestWinRatio: number;
    highestWinRatio: number;
  };
  competitorEstimate: number;
  asiriDusukSinir: number;
}

interface BidScoreData {
  overall: number;
  breakdown: {
    priceCompetitiveness: number;
    benchmarkAlignment: number;
    winProbability: number;
    completeness: number;
  };
  grade: string;
  gradeLabel: string;
  recommendations: string[];
}

interface OptimizationData {
  benchmarks: BenchmarkResult[];
  winAnalysis: WinAnalysis;
  bidScore: BidScoreData;
  estimatedCost: number;
  competitorCount: number;
}

export default function SmartOptimizationPanel({
  tenderId,
  items,
  totalAmount,
}: {
  tenderId: string;
  items: CostLineItem[];
  totalAmount: number;
}) {
  const [data, setData] = useState<OptimizationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<"score" | "probability" | "benchmark" | "simulator">("score");

  // Simulation state
  const [simParams, setSimParams] = useState<SimulationParams>({
    ...DEFAULT_PARAMS,
    baseAmount: totalAmount,
  });
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);

  const analyze = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bids/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenderId,
          items: items.map((i) => ({
            description: i.description,
            unit: i.unit,
            unitPrice: i.unitPrice,
            quantity: i.quantity,
          })),
          totalAmount,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [tenderId, items, totalAmount]);

  const handleSimulate = useCallback(() => {
    const result = runSimulation({ ...simParams, baseAmount: totalAmount });
    setSimResult(result);
  }, [simParams, totalAmount]);

  const toggleParam = (key: keyof SimulationParams) => {
    setSimParams((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (!data && !loading) {
    return (
      <div className="bg-white rounded-xl border border-border p-8 text-center">
        <Zap size={40} className="mx-auto text-primary mb-3" />
        <h2 className="text-lg font-bold text-foreground mb-2">Akıllı Teklif Optimizasyonu</h2>
        <p className="text-sm text-foreground-light mb-1">
          AI destekli fiyat analizi, kazanma olasılığı ve benchmark karşılaştırması.
        </p>
        <p className="text-xs text-foreground-light mb-5">
          {items.length} kalem | Toplam: {formatCurrency(totalAmount)}
        </p>
        <button
          onClick={analyze}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
        >
          <Zap size={16} />
          Analizi Başlat
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-border p-12 text-center">
        <Loader2 size={32} className="mx-auto text-primary mb-3 animate-spin" />
        <p className="text-sm text-foreground-light">Teklif analiz ediliyor...</p>
      </div>
    );
  }

  if (!data) return null;

  const sections = [
    { id: "score" as const, label: "Teklif Skoru", icon: Gauge },
    { id: "probability" as const, label: "Kazanma Olasılığı", icon: TrendingUp },
    { id: "benchmark" as const, label: "Birim Fiyat Benchmark", icon: BarChart3 },
    { id: "simulator" as const, label: "Maliyet Simülasyonu", icon: Calculator },
  ];

  return (
    <div className="space-y-4">
      {/* Section tabs */}
      <div className="flex gap-1 overflow-x-auto scrollbar-hide">
        {sections.map((sec) => (
          <button
            key={sec.id}
            onClick={() => setActiveSection(sec.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              activeSection === sec.id
                ? "bg-primary text-white"
                : "bg-white text-foreground-light border border-border hover:bg-gray-50"
            }`}
          >
            <sec.icon size={14} />
            {sec.label}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={analyze}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-gray-100 text-foreground-light hover:bg-gray-200 transition-colors"
        >
          <Zap size={12} />
          Yenile
        </button>
      </div>

      {/* ── Bid Score ── */}
      {activeSection === "score" && (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="p-5">
            <div className="flex items-center gap-4 mb-6">
              {/* Score circle */}
              <div className="relative w-24 h-24 shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                  <circle
                    cx="50" cy="50" r="42" fill="none"
                    stroke={data.bidScore.overall >= 70 ? "#10b981" : data.bidScore.overall >= 50 ? "#f59e0b" : "#ef4444"}
                    strokeWidth="8"
                    strokeDasharray={`${(data.bidScore.overall / 100) * 264} 264`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-foreground">{data.bidScore.overall}</span>
                  <span className="text-[10px] text-foreground-light">/100</span>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-lg font-bold ${
                    data.bidScore.grade === "A" ? "text-emerald-600" :
                    data.bidScore.grade === "B" ? "text-blue-600" :
                    data.bidScore.grade === "C" ? "text-amber-600" : "text-red-600"
                  }`}>
                    {data.bidScore.grade}
                  </span>
                  <span className="text-sm text-foreground">{data.bidScore.gradeLabel}</span>
                </div>
                <p className="text-xs text-foreground-light">
                  Tahmini bedel: {formatCurrency(data.estimatedCost)} | Teklifiniz: {formatCurrency(totalAmount)} | Oran: %{Math.round((totalAmount / data.estimatedCost) * 100)}
                </p>
              </div>
            </div>

            {/* Score breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              {[
                { label: "Fiyat Rekabetçiliği", value: data.bidScore.breakdown.priceCompetitiveness, max: 30 },
                { label: "Benchmark Uyumu", value: data.bidScore.breakdown.benchmarkAlignment, max: 25 },
                { label: "Kazanma Olasılığı", value: data.bidScore.breakdown.winProbability, max: 25 },
                { label: "Tamamlanma", value: data.bidScore.breakdown.completeness, max: 20 },
              ].map((item) => (
                <div key={item.label} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-foreground-light">{item.label}</span>
                    <span className="text-xs font-semibold">{item.value}/{item.max}</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${(item.value / item.max) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Recommendations */}
            {data.bidScore.recommendations.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-foreground-light">Öneriler:</p>
                {data.bidScore.recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    {rec.includes("UYARI") || rec.includes("aşırı düşük") || rec.includes("düşük") ? (
                      <AlertTriangle size={12} className="text-amber-500 mt-0.5 shrink-0" />
                    ) : rec.includes("hazır") || rec.includes("rekabetçi") ? (
                      <CheckCircle2 size={12} className="text-emerald-500 mt-0.5 shrink-0" />
                    ) : (
                      <Info size={12} className="text-blue-500 mt-0.5 shrink-0" />
                    )}
                    <span className="text-foreground">{rec}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Win Probability ── */}
      {activeSection === "probability" && (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={18} className="text-primary" />
              <h3 className="text-lg font-bold text-foreground">Kazanma Olasılığı Eğrisi</h3>
            </div>

            {/* Chart: SVG bar chart of probability curve */}
            <div className="mb-5">
              <svg viewBox="0 0 500 200" className="w-full h-48">
                {data.winAnalysis.curve.map((point, i) => {
                  const x = 40 + i * 42;
                  const barHeight = (point.probability / 100) * 160;
                  const isOptimal = point.bidAmount === data.winAnalysis.optimalPoint.bidAmount;
                  const isCurrentBid = Math.abs(point.bidAmount - totalAmount) < data.estimatedCost * 0.02;

                  return (
                    <g key={i}>
                      <rect
                        x={x}
                        y={180 - barHeight}
                        width={34}
                        height={barHeight}
                        rx={3}
                        fill={isOptimal ? "#10b981" : isCurrentBid ? "#1a56db" : "#cbd5e1"}
                        opacity={0.9}
                      />
                      <text x={x + 17} y={175 - barHeight} textAnchor="middle" fontSize="9" fill="#374151" fontWeight="600">
                        %{point.probability}
                      </text>
                      <text x={x + 17} y={196} textAnchor="middle" fontSize="7" fill="#94a3b8">
                        {(point.bidAmount / 1_000_000).toFixed(1)}M
                      </text>
                    </g>
                  );
                })}
                {/* Aşırı düşük line */}
                {(() => {
                  const adIdx = data.winAnalysis.curve.findIndex(
                    (p) => p.bidAmount >= data.winAnalysis.asiriDusukSinir
                  );
                  if (adIdx >= 0) {
                    const x = 40 + adIdx * 42;
                    return (
                      <>
                        <line x1={x} y1={10} x2={x} y2={185} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4" />
                        <text x={x + 4} y={14} fontSize="7" fill="#ef4444">Aşırı düşük</text>
                      </>
                    );
                  }
                  return null;
                })()}
              </svg>
              <div className="flex items-center gap-4 justify-center text-[10px] text-foreground-light mt-2">
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-500 rounded" /> Optimal</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-primary rounded" /> Teklifiniz</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-gray-300 rounded" /> Diğer</span>
              </div>
            </div>

            {/* Optimal point & key stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="bg-emerald-50 rounded-lg p-3 text-center">
                <p className="text-xs text-emerald-700 font-medium">Optimal Teklif</p>
                <p className="text-lg font-bold text-emerald-700">{formatCurrency(data.winAnalysis.optimalPoint.bidAmount)}</p>
                <p className="text-[10px] text-emerald-600">%{data.winAnalysis.optimalPoint.probability} kazanma</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-xs text-blue-700 font-medium">Tahmini Bedel</p>
                <p className="text-lg font-bold text-blue-700">{formatCurrency(data.estimatedCost)}</p>
                <p className="text-[10px] text-blue-600">{data.winAnalysis.historicalData.sampleCount} benzer ihale</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <p className="text-xs text-red-700 font-medium">Aşırı Düşük Sınırı</p>
                <p className="text-lg font-bold text-red-700">{formatCurrency(data.winAnalysis.asiriDusukSinir)}</p>
                <p className="text-[10px] text-red-600">Bu altında elenirsiniz</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 text-center">
                <p className="text-xs text-purple-700 font-medium">Tahmini Rakip</p>
                <p className="text-lg font-bold text-purple-700">{data.competitorCount}</p>
                <p className="text-[10px] text-purple-600">firma başvurdu</p>
              </div>
            </div>

            {/* Historical stats */}
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-medium text-foreground-light mb-2">Geçmiş Kazanan Analizi</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div><span className="text-foreground-light">Ort. kazanan oranı:</span> <span className="font-semibold">%{data.winAnalysis.historicalData.avgWinningRatio}</span></div>
                <div><span className="text-foreground-light">Medyan:</span> <span className="font-semibold">%{data.winAnalysis.historicalData.medianWinningRatio}</span></div>
                <div><span className="text-foreground-light">En düşük:</span> <span className="font-semibold">%{data.winAnalysis.historicalData.lowestWinRatio}</span></div>
                <div><span className="text-foreground-light">En yüksek:</span> <span className="font-semibold">%{data.winAnalysis.historicalData.highestWinRatio}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Benchmark ── */}
      {activeSection === "benchmark" && (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <BarChart3 size={18} className="text-primary" />
              <h3 className="text-lg font-bold text-foreground">Birim Fiyat Benchmark</h3>
            </div>
            <p className="text-xs text-foreground-light mt-1">
              Kalemlerinizin piyasa ortalamalarıyla karşılaştırması
            </p>
          </div>

          {data.benchmarks.length === 0 ? (
            <div className="p-8 text-center text-sm text-foreground-light">
              Benchmark analizi için maliyet kalemlerinizi ekleyin.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {data.benchmarks.map((bm, i) => (
                <div key={i} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">{bm.itemName}</p>
                      <p className="text-xs text-foreground-light">{bm.unit} başına</p>
                    </div>
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                      bm.status === "competitive" ? "bg-emerald-100 text-emerald-700" :
                      bm.status === "risky_low" ? "bg-red-100 text-red-700" :
                      "bg-amber-100 text-amber-700"
                    }`}>
                      {bm.status === "competitive" ? <CheckCircle2 size={10} /> :
                       bm.status === "risky_low" ? <XCircle size={10} /> :
                       <AlertTriangle size={10} />}
                      {bm.statusLabel}
                    </span>
                  </div>

                  {bm.marketAvg > 0 && (
                    <>
                      {/* Price range bar */}
                      <div className="relative h-6 bg-gray-100 rounded-full overflow-hidden mb-2">
                        {/* Market range background */}
                        <div
                          className="absolute h-full bg-blue-100 rounded-full"
                          style={{
                            left: `${Math.max(0, ((bm.marketMin - bm.marketMin * 0.8) / (bm.marketMax * 1.2 - bm.marketMin * 0.8)) * 100)}%`,
                            width: `${((bm.marketMax - bm.marketMin) / (bm.marketMax * 1.2 - bm.marketMin * 0.8)) * 100}%`,
                          }}
                        />
                        {/* Your price marker */}
                        <div
                          className="absolute top-0 h-full w-1 bg-primary rounded"
                          style={{
                            left: `${Math.min(100, Math.max(0, ((bm.yourPrice - bm.marketMin * 0.8) / (bm.marketMax * 1.2 - bm.marketMin * 0.8)) * 100))}%`,
                          }}
                        >
                          <Target size={10} className="text-primary absolute -top-0.5 -left-1" />
                        </div>
                      </div>
                      <div className="flex justify-between text-[10px] text-foreground-light mb-1">
                        <span>Min: {bm.marketMin.toLocaleString("tr-TR")} ₺</span>
                        <span>Ort: {bm.marketAvg.toLocaleString("tr-TR")} ₺</span>
                        <span>Max: {bm.marketMax.toLocaleString("tr-TR")} ₺</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-foreground">Sizin fiyatınız: <strong>{bm.yourPrice.toLocaleString("tr-TR")} ₺</strong></span>
                        <span className={`font-medium ${bm.deviation > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                          ({bm.deviation > 0 ? "+" : ""}{bm.deviation}%)
                        </span>
                      </div>
                    </>
                  )}
                  <p className="text-[11px] text-foreground-light mt-1">{bm.suggestion}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Cost Simulator ── */}
      {activeSection === "simulator" && (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Calculator size={18} className="text-primary" />
              <h3 className="text-lg font-bold text-foreground">Maliyet Simülasyonu</h3>
            </div>
            <p className="text-xs text-foreground-light mt-1">
              Toggle&apos;larla anlık yeniden hesaplama
            </p>
          </div>
          <div className="p-5">
            <div className="space-y-3 mb-5">
              {/* KDV Toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-foreground">KDV Dahil</p>
                  <p className="text-xs text-foreground-light">%{simParams.kdvRate} KDV ekle</p>
                </div>
                <button onClick={() => toggleParam("kdvIncluded")} className="text-primary">
                  {simParams.kdvIncluded ? <ToggleRight size={28} /> : <ToggleLeft size={28} className="text-gray-400" />}
                </button>
              </div>

              {/* Transport Toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Nakliye Ekle</p>
                  {simParams.transportEnabled && (
                    <input
                      type="number"
                      value={simParams.transportCost || ""}
                      onChange={(e) => setSimParams((p) => ({ ...p, transportCost: parseFloat(e.target.value) || 0 }))}
                      className="mt-1 w-32 h-8 px-2 text-xs border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Tutar (₺)"
                    />
                  )}
                </div>
                <button onClick={() => toggleParam("transportEnabled")} className="text-primary">
                  {simParams.transportEnabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} className="text-gray-400" />}
                </button>
              </div>

              {/* Profit margin toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Kâr Marjı Ekle</p>
                  {simParams.profitMarginEnabled && (
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="number"
                        value={simParams.profitMarginPercent || ""}
                        onChange={(e) => setSimParams((p) => ({ ...p, profitMarginPercent: parseFloat(e.target.value) || 0 }))}
                        className="w-20 h-8 px-2 text-xs border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                        min={0}
                        max={50}
                      />
                      <span className="text-xs text-foreground-light">%</span>
                    </div>
                  )}
                </div>
                <button onClick={() => toggleParam("profitMarginEnabled")} className="text-primary">
                  {simParams.profitMarginEnabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} className="text-gray-400" />}
                </button>
              </div>

              {/* Discount toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">İskonto Uygula</p>
                  {simParams.discountEnabled && (
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="number"
                        value={simParams.discountPercent || ""}
                        onChange={(e) => setSimParams((p) => ({ ...p, discountPercent: parseFloat(e.target.value) || 0 }))}
                        className="w-20 h-8 px-2 text-xs border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                        min={0}
                        max={50}
                      />
                      <span className="text-xs text-foreground-light">%</span>
                    </div>
                  )}
                </div>
                <button onClick={() => toggleParam("discountEnabled")} className="text-primary">
                  {simParams.discountEnabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} className="text-gray-400" />}
                </button>
              </div>

              {/* Insurance toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Sigorta Ekle</p>
                  {simParams.insuranceEnabled && (
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="number"
                        value={simParams.insurancePercent || ""}
                        onChange={(e) => setSimParams((p) => ({ ...p, insurancePercent: parseFloat(e.target.value) || 0 }))}
                        className="w-20 h-8 px-2 text-xs border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                        min={0}
                        max={10}
                      />
                      <span className="text-xs text-foreground-light">%</span>
                    </div>
                  )}
                </div>
                <button onClick={() => toggleParam("insuranceEnabled")} className="text-primary">
                  {simParams.insuranceEnabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} className="text-gray-400" />}
                </button>
              </div>
            </div>

            <button
              onClick={handleSimulate}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
            >
              <Calculator size={16} />
              Hesapla
            </button>

            {/* Simulation Result */}
            {simResult && (
              <div className="mt-5 border-t border-border pt-5">
                <div className="space-y-2">
                  {simResult.breakdown.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-foreground-light">{item.label}</span>
                      <span className={`font-medium ${
                        item.type === "subtract" ? "text-red-600" :
                        item.type === "add" ? "text-emerald-600" : "text-foreground"
                      }`}>
                        {item.type === "subtract" ? "-" : item.type === "add" ? "+" : ""}
                        {formatCurrency(Math.abs(item.amount))}
                      </span>
                    </div>
                  ))}
                  <div className="border-t border-border pt-2 flex items-center justify-between">
                    <span className="text-base font-bold text-foreground">Nihai Tutar</span>
                    <span className="text-xl font-bold text-primary">{formatCurrency(simResult.finalAmount)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
