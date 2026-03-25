"use client";

import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
  Building2,
  BarChart3,
  Calendar,
  DollarSign,
  Users,
  MapPin,
  Loader2,
  Minus,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  FileDown,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────

type Tab = "trends" | "institutions" | "seasonal" | "prices" | "competition";

interface SectorTrend {
  sector: string;
  currentCount: number;
  previousCount: number;
  growthRate: number;
  currentBudget: number;
  previousBudget: number;
  budgetChange: number;
  avgBudget: number;
}

interface InstitutionData {
  institution: string;
  totalBudget: number;
  tenderCount: number;
  byType: { type: string; count: number; budget: number; percentage: number }[];
  avgBudget: number;
}

interface MonthlyPattern {
  month: number;
  monthName: string;
  count: number;
  budget: number;
}

interface PriceIndexItem {
  item: string;
  unit: string;
  price: number;
  prevPrice: number | null;
  change: number | null;
  month: string;
}

interface PriceIndexData {
  sector: string;
  items: PriceIndexItem[];
}

interface CompetitionData {
  city: string;
  sector: string;
  avgBidders: number;
  winRate: number;
  totalTenders: number;
  totalBudget: number;
  intensity: "low" | "medium" | "high";
}

// ─── Main Component ─────────────────────────────────────

export default function MarketIntelligenceClient() {
  const [tab, setTab] = useState<Tab>("trends");
  const [trends, setTrends] = useState<SectorTrend[]>([]);
  const [institutions, setInstitutions] = useState<InstitutionData[]>([]);
  const [seasonal, setSeasonal] = useState<MonthlyPattern[]>([]);
  const [prices, setPrices] = useState<PriceIndexData[]>([]);
  const [competition, setCompetition] = useState<CompetitionData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (t: Tab) => {
    setLoading(true);
    try {
      const endpoints: Record<Tab, string> = {
        trends: "/api/market/trend",
        institutions: "/api/market/institutions",
        seasonal: "/api/market/seasonal",
        prices: "/api/market/price-index",
        competition: "/api/market/competition",
      };
      const res = await fetch(endpoints[t]);
      const data = await res.json();
      if (data.success) {
        if (t === "trends") setTrends(data.data);
        if (t === "institutions") setInstitutions(data.data);
        if (t === "seasonal") setSeasonal(data.data);
        if (t === "prices") setPrices(data.data);
        if (t === "competition") setCompetition(data.data);
      }
    } catch {
      // handle
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(tab);
  }, [tab, fetchData]);

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "trends", label: "Sektör Trendleri", icon: TrendingUp },
    { key: "institutions", label: "Kurum Harcamaları", icon: Building2 },
    { key: "seasonal", label: "Mevsimsel", icon: Calendar },
    { key: "prices", label: "Fiyat Endeksi", icon: DollarSign },
    { key: "competition", label: "Rekabet Haritası", icon: Target },
  ];

  return (
    <div className="bg-background-alt min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-background-dark to-primary py-8 md:py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
                Pazar İstihbaratı
              </h1>
              <p className="text-blue-200 text-sm">
                İhale verisinden stratejik istihbarat — trend, kurum, mevsimsel, fiyat, rekabet analizi
              </p>
            </div>
            <button className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <FileDown size={16} />
              PDF Rapor
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1 mb-6 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  tab === t.key
                    ? "bg-primary text-white shadow-sm"
                    : "bg-white text-foreground-light hover:bg-gray-50 border border-border"
                }`}
              >
                <Icon size={16} />
                {t.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 gap-2 text-foreground-light">
            <Loader2 size={20} className="animate-spin" />
            Veriler yükleniyor...
          </div>
        ) : (
          <>
            {tab === "trends" && <TrendsPanel data={trends} />}
            {tab === "institutions" && <InstitutionsPanel data={institutions} />}
            {tab === "seasonal" && <SeasonalPanel data={seasonal} />}
            {tab === "prices" && <PricesPanel data={prices} />}
            {tab === "competition" && <CompetitionPanel data={competition} />}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Trends Panel ───────────────────────────────────────

function TrendsPanel({ data }: { data: SectorTrend[] }) {
  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {data.map((t) => (
          <div key={t.sector} className="bg-white rounded-xl border border-border p-4">
            <p className="text-xs text-foreground-light mb-1">{t.sector}</p>
            <p className="text-2xl font-bold text-foreground">{t.currentCount}</p>
            <div className="flex items-center gap-1 mt-1">
              {t.growthRate > 0 ? (
                <ArrowUpRight size={14} className="text-emerald-500" />
              ) : t.growthRate < 0 ? (
                <ArrowDownRight size={14} className="text-red-500" />
              ) : (
                <Minus size={14} className="text-gray-400" />
              )}
              <span
                className={`text-xs font-medium ${
                  t.growthRate > 0 ? "text-emerald-600" : t.growthRate < 0 ? "text-red-600" : "text-gray-500"
                }`}
              >
                {t.growthRate > 0 ? "+" : ""}{t.growthRate}%
              </span>
              <span className="text-[10px] text-foreground-light">son 3 ay</span>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <BarChart3 size={16} className="text-primary" />
            Sektör Trend Raporu (Son 3 Ay)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-foreground-light text-xs">
                <th className="text-left px-5 py-3 font-medium">Sektör</th>
                <th className="text-right px-5 py-3 font-medium">İhale Sayısı</th>
                <th className="text-right px-5 py-3 font-medium">Değişim</th>
                <th className="text-right px-5 py-3 font-medium">Toplam Bütçe</th>
                <th className="text-right px-5 py-3 font-medium">Bütçe Değişimi</th>
                <th className="text-right px-5 py-3 font-medium">Ort. Bütçe</th>
              </tr>
            </thead>
            <tbody>
              {data.map((t) => (
                <tr key={t.sector} className="border-b border-border/50 hover:bg-gray-50/50">
                  <td className="px-5 py-3 font-medium text-foreground">{t.sector}</td>
                  <td className="px-5 py-3 text-right">{t.currentCount}</td>
                  <td className="px-5 py-3 text-right">
                    <span className={`font-medium ${
                      t.growthRate > 0 ? "text-emerald-600" : t.growthRate < 0 ? "text-red-600" : "text-gray-500"
                    }`}>
                      {t.growthRate > 0 ? "+" : ""}{t.growthRate}%
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">{fmtBudget(t.currentBudget)}</td>
                  <td className="px-5 py-3 text-right">
                    <span className={`font-medium ${
                      t.budgetChange > 0 ? "text-emerald-600" : t.budgetChange < 0 ? "text-red-600" : "text-gray-500"
                    }`}>
                      {t.budgetChange > 0 ? "+" : ""}{t.budgetChange}%
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-foreground-light">{fmtBudget(t.avgBudget)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Institutions Panel ─────────────────────────────────

function InstitutionsPanel({ data }: { data: InstitutionData[] }) {
  return (
    <div className="space-y-4">
      {data.length === 0 ? (
        <EmptyPanel icon={Building2} message="Kurum verisi bulunamadı" />
      ) : (
        data.map((inst) => (
          <div key={inst.institution} className="bg-white rounded-xl border border-border p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">{inst.institution}</h3>
                <p className="text-xs text-foreground-light mt-0.5">
                  {inst.tenderCount} ihale · Toplam {fmtBudget(inst.totalBudget)}
                </p>
              </div>
              <span className="text-lg font-bold text-primary">{fmtBudget(inst.totalBudget)}</span>
            </div>

            {/* Type breakdown bar */}
            <div className="h-3 rounded-full overflow-hidden flex mb-2">
              {inst.byType.map((t, i) => {
                const colors = ["bg-primary", "bg-emerald-500", "bg-amber-500", "bg-purple-500"];
                return (
                  <div
                    key={t.type}
                    className={`${colors[i % colors.length]} transition-all`}
                    style={{ width: `${t.percentage}%` }}
                    title={`${t.type}: ${t.percentage}%`}
                  />
                );
              })}
            </div>

            <div className="flex flex-wrap gap-3">
              {inst.byType.map((t, i) => {
                const dotColors = ["bg-primary", "bg-emerald-500", "bg-amber-500", "bg-purple-500"];
                return (
                  <div key={t.type} className="flex items-center gap-1.5 text-xs text-foreground-light">
                    <span className={`w-2 h-2 rounded-full ${dotColors[i % dotColors.length]}`} />
                    {t.type} %{t.percentage}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ─── Seasonal Panel ─────────────────────────────────────

function SeasonalPanel({ data }: { data: MonthlyPattern[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const currentMonth = new Date().getMonth() + 1;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Calendar size={16} className="text-primary" />
          Aylık İhale Dağılımı — Mevsimsel Pattern
        </h3>

        <div className="flex items-end gap-2 h-48">
          {data.map((d) => {
            const height = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
            const isCurrent = d.month === currentMonth;
            const isPeak = d.count === maxCount;

            return (
              <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                {isPeak && (
                  <span className="text-[9px] text-primary font-bold">Pik</span>
                )}
                <span className="text-[10px] text-foreground-light font-medium">{d.count}</span>
                <div
                  className={`w-full rounded-t-md transition-all ${
                    isCurrent
                      ? "bg-primary"
                      : isPeak
                        ? "bg-primary/70"
                        : "bg-primary/20"
                  }`}
                  style={{ height: `${Math.max(4, height)}%` }}
                />
                <span className={`text-[10px] ${isCurrent ? "text-primary font-bold" : "text-foreground-light"}`}>
                  {d.monthName.slice(0, 3)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Insight text */}
        {data.length > 0 && (
          <div className="mt-4 p-3 bg-primary/5 rounded-lg">
            <p className="text-xs text-foreground">
              {(() => {
                const sorted = [...data].sort((a, b) => b.count - a.count);
                const peak = sorted[0];
                const low = sorted[sorted.length - 1];
                return `📊 En yoğun dönem: ${peak.monthName} (${peak.count} ihale). En düşük: ${low.monthName} (${low.count} ihale).`;
              })()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Prices Panel ───────────────────────────────────────

function PricesPanel({ data }: { data: PriceIndexData[] }) {
  return (
    <div className="space-y-4">
      {data.length === 0 ? (
        <EmptyPanel icon={DollarSign} message="Fiyat endeksi verisi bulunamadı" />
      ) : (
        data.map((sector) => (
          <div key={sector.sector} className="bg-white rounded-xl border border-border overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-gray-50">
              <h3 className="text-sm font-semibold text-foreground">{sector.sector}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-foreground-light">
                    <th className="text-left px-5 py-2.5 font-medium">Kalem</th>
                    <th className="text-right px-5 py-2.5 font-medium">Birim</th>
                    <th className="text-right px-5 py-2.5 font-medium">Fiyat</th>
                    <th className="text-right px-5 py-2.5 font-medium">Önceki</th>
                    <th className="text-right px-5 py-2.5 font-medium">Değişim</th>
                  </tr>
                </thead>
                <tbody>
                  {sector.items.map((item) => (
                    <tr key={item.item} className="border-b border-border/50 hover:bg-gray-50/50">
                      <td className="px-5 py-2.5 font-medium text-foreground">{item.item}</td>
                      <td className="px-5 py-2.5 text-right text-foreground-light">{item.unit}</td>
                      <td className="px-5 py-2.5 text-right font-semibold text-foreground">
                        {item.price.toLocaleString("tr-TR")} ₺
                      </td>
                      <td className="px-5 py-2.5 text-right text-foreground-light">
                        {item.prevPrice ? `${item.prevPrice.toLocaleString("tr-TR")} ₺` : "—"}
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        {item.change !== null ? (
                          <span className={`inline-flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full ${
                            item.change > 0 ? "bg-red-100 text-red-700" : item.change < 0 ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"
                          }`}>
                            {item.change > 0 ? <TrendingUp size={10} /> : item.change < 0 ? <TrendingDown size={10} /> : <Minus size={10} />}
                            {item.change > 0 ? "+" : ""}{item.change}%
                          </span>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ─── Competition Panel ──────────────────────────────────

function CompetitionPanel({ data }: { data: CompetitionData[] }) {
  const intensityStyles = {
    low: { bg: "bg-emerald-100 text-emerald-700", label: "Düşük" },
    medium: { bg: "bg-amber-100 text-amber-700", label: "Orta" },
    high: { bg: "bg-red-100 text-red-700", label: "Yüksek" },
  };

  return (
    <div className="space-y-4">
      {data.length === 0 ? (
        <EmptyPanel icon={Target} message="Rekabet verisi bulunamadı" />
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Target size={16} className="text-primary" />
              Rekabet Yoğunluk Haritası — İl × Sektör
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-foreground-light">
                  <th className="text-left px-5 py-3 font-medium">İl</th>
                  <th className="text-left px-5 py-3 font-medium">Sektör</th>
                  <th className="text-right px-5 py-3 font-medium">Ort. Teklif Veren</th>
                  <th className="text-right px-5 py-3 font-medium">Kazanma Oranı</th>
                  <th className="text-right px-5 py-3 font-medium">İhale Sayısı</th>
                  <th className="text-center px-5 py-3 font-medium">Yoğunluk</th>
                </tr>
              </thead>
              <tbody>
                {data.map((d, i) => {
                  const style = intensityStyles[d.intensity];
                  return (
                    <tr key={i} className="border-b border-border/50 hover:bg-gray-50/50">
                      <td className="px-5 py-3 font-medium text-foreground flex items-center gap-1.5">
                        <MapPin size={12} className="text-foreground-light" />
                        {d.city}
                      </td>
                      <td className="px-5 py-3 text-foreground-light">{d.sector}</td>
                      <td className="px-5 py-3 text-right font-medium text-foreground flex items-center justify-end gap-1.5">
                        <Users size={12} className="text-foreground-light" />
                        {d.avgBidders.toFixed(1)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className={`font-medium ${d.winRate > 15 ? "text-emerald-600" : d.winRate > 8 ? "text-amber-600" : "text-red-600"}`}>
                          %{d.winRate.toFixed(1)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right text-foreground-light">{d.totalTenders}</td>
                      <td className="px-5 py-3 text-center">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${style.bg}`}>
                          {style.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────

function fmtBudget(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} milyar ₺`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M ₺`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K ₺`;
  return `${value.toLocaleString("tr-TR")} ₺`;
}

function EmptyPanel({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="text-center py-16">
      <Icon size={40} className="mx-auto text-foreground-light/30 mb-3" />
      <p className="text-sm font-medium text-foreground-light">{message}</p>
      <p className="text-xs text-foreground-light/70 mt-1">Veri toplandıkça otomatik olarak güncellenecektir.</p>
    </div>
  );
}
