"use client";

import { useState, useMemo } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Download,
  Users,
  FileText,
  DollarSign,
  Activity,
  Search,
  Eye,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  MapPin,
} from "lucide-react";
import {
  generateDailyStats,
  aggregateWeekly,
  aggregateMonthly,
  generateSectorStats,
  generateCityStats,
  generateUserActivity,
  generateTopSearchTerms,
  generateTopViewedTenders,
  generatePeriodComparison,
  exportToCSV,
  type TimeRange,
  type DailyTenderStat,
} from "@/lib/analytics-data";
import { formatCurrency } from "@/lib/format";

type Tab = "overview" | "tenders" | "users" | "comparison";

const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "overview", label: "Genel Bakış", icon: BarChart3 },
  { key: "tenders", label: "İhale İstatistikleri", icon: FileText },
  { key: "users", label: "Kullanıcı Aktivitesi", icon: Users },
  { key: "comparison", label: "Dönem Karşılaştırma", icon: Activity },
];

export default function AdminDashboardClient() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [timeRange, setTimeRange] = useState<TimeRange>("daily");

  const dailyStats = useMemo(() => generateDailyStats(), []);
  const sectorStats = useMemo(() => generateSectorStats(), []);
  const cityStats = useMemo(() => generateCityStats(), []);
  const userActivity = useMemo(() => generateUserActivity(), []);
  const topSearchTerms = useMemo(() => generateTopSearchTerms(), []);
  const topViewedTenders = useMemo(() => generateTopViewedTenders(), []);
  const periodComparison = useMemo(() => generatePeriodComparison(), []);

  const chartData = useMemo(() => {
    if (timeRange === "weekly") return aggregateWeekly(dailyStats);
    if (timeRange === "monthly") return aggregateMonthly(dailyStats);
    return dailyStats.slice(-30); // last 30 days for daily
  }, [dailyStats, timeRange]);

  // Summary stats
  const totalTenders = dailyStats.reduce((s, d) => s + d.count, 0);
  const totalBudget = dailyStats.reduce((s, d) => s + d.totalBudget, 0);
  const avgDailyTenders = Math.round(totalTenders / dailyStats.length);
  const totalLogins = userActivity.reduce((s, d) => s + d.loginCount, 0);

  return (
    <div className="bg-background-alt min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-background-dark to-primary py-8 md:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
            Raporlama & Analitik
          </h1>
          <p className="text-blue-200 text-sm">
            İhale istatistikleri, kullanıcı aktiviteleri ve dönem karşılaştırmaları
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <SummaryCard
            icon={FileText}
            iconColor="text-primary"
            iconBg="bg-blue-100"
            label="Toplam İhale (90 gün)"
            value={totalTenders.toLocaleString("tr-TR")}
          />
          <SummaryCard
            icon={DollarSign}
            iconColor="text-accent"
            iconBg="bg-green-100"
            label="Toplam Bütçe"
            value={formatCurrency(totalBudget)}
          />
          <SummaryCard
            icon={TrendingUp}
            iconColor="text-secondary"
            iconBg="bg-orange-100"
            label="Günlük Ortalama"
            value={`${avgDailyTenders} ihale`}
          />
          <SummaryCard
            icon={Users}
            iconColor="text-purple-600"
            iconBg="bg-purple-100"
            label="Kullanıcı Girişi (30 gün)"
            value={totalLogins.toLocaleString("tr-TR")}
          />
        </div>

        {/* Tab nav */}
        <div className="flex gap-1 overflow-x-auto pb-1 mb-6 scrollbar-hide">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.key
                    ? "bg-primary text-white shadow-sm"
                    : "bg-white text-foreground-light hover:bg-gray-50 border border-border"
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        {activeTab === "overview" && (
          <OverviewTab
            chartData={chartData}
            timeRange={timeRange}
            setTimeRange={setTimeRange}
            sectorStats={sectorStats}
            cityStats={cityStats}
            dailyStats={dailyStats}
          />
        )}
        {activeTab === "tenders" && (
          <TendersTab
            chartData={chartData}
            timeRange={timeRange}
            setTimeRange={setTimeRange}
            sectorStats={sectorStats}
            cityStats={cityStats}
            dailyStats={dailyStats}
          />
        )}
        {activeTab === "users" && (
          <UsersTab
            userActivity={userActivity}
            topSearchTerms={topSearchTerms}
            topViewedTenders={topViewedTenders}
          />
        )}
        {activeTab === "comparison" && (
          <ComparisonTab periodComparison={periodComparison} />
        )}
      </div>
    </div>
  );
}

/* ── Summary Card ──────────────────────────────── */

function SummaryCard({
  icon: Icon,
  iconColor,
  iconBg,
  label,
  value,
}: {
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-white rounded-xl p-4 border border-border">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 ${iconBg} rounded-lg flex items-center justify-center`}>
          <Icon size={20} className={iconColor} />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold text-foreground truncate">{value}</p>
          <p className="text-xs text-foreground-light">{label}</p>
        </div>
      </div>
    </div>
  );
}

/* ── Time Range Selector ───────────────────────── */

function TimeRangeSelector({
  value,
  onChange,
}: {
  value: TimeRange;
  onChange: (v: TimeRange) => void;
}) {
  const options: { key: TimeRange; label: string }[] = [
    { key: "daily", label: "Günlük" },
    { key: "weekly", label: "Haftalık" },
    { key: "monthly", label: "Aylık" },
  ];
  return (
    <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
      {options.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            value === o.key
              ? "bg-white text-primary shadow-sm"
              : "text-foreground-light hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ── SVG Line Chart ────────────────────────────── */

function LineChart({
  data,
  dataKey,
  color = "#1a56db",
  height = 200,
  formatValue,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
  dataKey: string;
  color?: string;
  height?: number;
  formatValue?: (v: number) => string;
}) {
  if (data.length === 0) return null;

  const values = data.map((d) => d[dataKey] as number);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  const padding = { top: 20, right: 10, bottom: 30, left: 10 };
  const w = 100; // percentage-based viewBox
  const h = height;
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;

  const points = values.map((v, i) => {
    const x = padding.left + (i / (values.length - 1)) * chartW;
    const y = padding.top + chartH - ((v - min) / range) * chartH;
    return { x, y, v, date: data[i].date };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

  // Y-axis labels
  const yLabels = [min, min + range * 0.5, max].map((v) => ({
    value: formatValue ? formatValue(Math.round(v)) : Math.round(v).toLocaleString("tr-TR"),
    y: padding.top + chartH - ((v - min) / range) * chartH,
  }));

  // X-axis labels (show ~5 labels)
  const step = Math.max(1, Math.floor(data.length / 5));
  const xLabels = data
    .filter((_, i) => i % step === 0 || i === data.length - 1)
    .map((d, idx) => {
      const origIdx = data.indexOf(d);
      return {
        label: d.date.slice(5), // MM-DD
        x: padding.left + (origIdx / (data.length - 1)) * chartW,
      };
    });

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none">
      {/* Grid lines */}
      {yLabels.map((yl, i) => (
        <line
          key={i}
          x1={padding.left}
          x2={w - padding.right}
          y1={yl.y}
          y2={yl.y}
          stroke="#e5e7eb"
          strokeWidth="0.2"
        />
      ))}
      {/* Area fill */}
      <path d={areaPath} fill={color} opacity="0.08" />
      {/* Line */}
      <path d={linePath} fill="none" stroke={color} strokeWidth="0.4" />
      {/* Dots */}
      {points.length <= 31 &&
        points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="0.6" fill={color}>
            <title>
              {p.date}: {formatValue ? formatValue(p.v) : p.v.toLocaleString("tr-TR")}
            </title>
          </circle>
        ))}
      {/* Y labels */}
      {yLabels.map((yl, i) => (
        <text
          key={i}
          x={padding.left + 1}
          y={yl.y - 1}
          fontSize="2.5"
          fill="#9ca3af"
        >
          {yl.value}
        </text>
      ))}
      {/* X labels */}
      {xLabels.map((xl, i) => (
        <text
          key={i}
          x={xl.x}
          y={h - 5}
          fontSize="2.2"
          fill="#9ca3af"
          textAnchor="middle"
        >
          {xl.label}
        </text>
      ))}
    </svg>
  );
}

/* ── SVG Bar Chart ─────────────────────────────── */

function BarChart({
  data,
  height = 200,
}: {
  data: { label: string; value: number; color: string }[];
  height?: number;
}) {
  if (data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.value));

  const padding = { top: 10, bottom: 40, left: 5, right: 5 };
  const w = 100;
  const h = height;
  const chartH = h - padding.top - padding.bottom;
  const barWidth = (w - padding.left - padding.right) / data.length * 0.7;
  const gap = (w - padding.left - padding.right) / data.length * 0.3;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none">
      {data.map((d, i) => {
        const barH = (d.value / max) * chartH;
        const x = padding.left + i * (barWidth + gap) + gap / 2;
        const y = padding.top + chartH - barH;
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barH}
              fill={d.color}
              rx="0.5"
              opacity="0.85"
            >
              <title>{d.label}: {d.value.toLocaleString("tr-TR")}</title>
            </rect>
            <text
              x={x + barWidth / 2}
              y={h - padding.bottom + 8}
              fontSize="2"
              fill="#6b7280"
              textAnchor="middle"
              transform={`rotate(-35, ${x + barWidth / 2}, ${h - padding.bottom + 8})`}
            >
              {d.label.length > 10 ? d.label.slice(0, 10) + "…" : d.label}
            </text>
            <text
              x={x + barWidth / 2}
              y={y - 2}
              fontSize="2"
              fill="#374151"
              textAnchor="middle"
              fontWeight="bold"
            >
              {d.value.toLocaleString("tr-TR")}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── City Heatmap ──────────────────────────────── */

function CityHeatmap({
  data,
}: {
  data: { city: string; count: number; totalBudget: number; intensity: number }[];
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
      {data.map((city) => {
        const bg = `rgba(26, 86, 219, ${0.08 + city.intensity * 0.85})`;
        const textColor = city.intensity > 0.5 ? "white" : "#1e293b";
        return (
          <div
            key={city.city}
            className="rounded-lg p-3 text-center transition-transform hover:scale-105"
            style={{ backgroundColor: bg }}
          >
            <p className="text-xs font-bold" style={{ color: textColor }}>
              {city.city}
            </p>
            <p className="text-lg font-bold mt-0.5" style={{ color: textColor }}>
              {city.count}
            </p>
            <p className="text-[10px] opacity-80" style={{ color: textColor }}>
              ihale
            </p>
          </div>
        );
      })}
    </div>
  );
}

/* ── Overview Tab ──────────────────────────────── */

function OverviewTab({
  chartData,
  timeRange,
  setTimeRange,
  sectorStats,
  cityStats,
  dailyStats,
}: {
  chartData: DailyTenderStat[];
  timeRange: TimeRange;
  setTimeRange: (v: TimeRange) => void;
  sectorStats: ReturnType<typeof generateSectorStats>;
  cityStats: ReturnType<typeof generateCityStats>;
  dailyStats: DailyTenderStat[];
}) {
  return (
    <div className="space-y-6">
      {/* Tender count trend */}
      <div className="bg-white rounded-xl border border-border p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              İhale Sayısı Trendi
            </h2>
            <p className="text-xs text-foreground-light">
              Son 90 günlük ihale yayınlanma istatistikleri
            </p>
          </div>
          <div className="flex items-center gap-2">
            <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
            <button
              onClick={() =>
                exportToCSV(
                  dailyStats.map((d) => ({
                    Tarih: d.date,
                    "İhale Sayısı": d.count,
                    "Toplam Bütçe": d.totalBudget,
                  })),
                  "ihale-trendi"
                )
              }
              className="p-2 border border-border rounded-lg hover:bg-gray-50 transition-colors"
              title="CSV olarak indir"
            >
              <Download size={16} className="text-foreground-light" />
            </button>
          </div>
        </div>
        <div className="h-[200px]">
          <LineChart data={chartData} dataKey="count" color="#1a56db" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sector distribution */}
        <div className="bg-white rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground">
              Sektörel Dağılım
            </h2>
            <button
              onClick={() =>
                exportToCSV(
                  sectorStats.map((s) => ({
                    Sektör: s.sector,
                    "İhale Sayısı": s.count,
                    "Toplam Bütçe": s.totalBudget,
                    "Ortalama Bütçe": s.avgBudget,
                  })),
                  "sektorel-dagilim"
                )
              }
              className="p-2 border border-border rounded-lg hover:bg-gray-50 transition-colors"
              title="CSV olarak indir"
            >
              <Download size={16} className="text-foreground-light" />
            </button>
          </div>
          <BarChart
            data={sectorStats.map((s) => ({
              label: s.sector,
              value: s.count,
              color: s.color,
            }))}
            height={180}
          />
        </div>

        {/* Average budget trend */}
        <div className="bg-white rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground">
              Ortalama Bütçe Trendi
            </h2>
            <button
              onClick={() =>
                exportToCSV(
                  chartData.map((d) => ({
                    Tarih: d.date,
                    "Ortalama Bütçe": d.count > 0 ? Math.round(d.totalBudget / d.count) : 0,
                  })),
                  "ortalama-butce-trendi"
                )
              }
              className="p-2 border border-border rounded-lg hover:bg-gray-50 transition-colors"
              title="CSV olarak indir"
            >
              <Download size={16} className="text-foreground-light" />
            </button>
          </div>
          <div className="h-[180px]">
            <LineChart
              data={chartData.map((d) => ({
                ...d,
                avgBudget: d.count > 0 ? Math.round(d.totalBudget / d.count) : 0,
              }))}
              dataKey="avgBudget"
              color="#10b981"
              height={180}
              formatValue={(v) => formatCurrency(v)}
            />
          </div>
        </div>
      </div>

      {/* City heatmap */}
      <div className="bg-white rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <MapPin size={20} className="text-primary" />
              İl Bazlı Yoğunluk Haritası
            </h2>
            <p className="text-xs text-foreground-light mt-1">
              Renk yoğunluğu ihale sayısına göre belirlenir
            </p>
          </div>
          <button
            onClick={() =>
              exportToCSV(
                cityStats.map((c) => ({
                  İl: c.city,
                  "İhale Sayısı": c.count,
                  "Toplam Bütçe": c.totalBudget,
                })),
                "il-bazli-istatistik"
              )
            }
            className="p-2 border border-border rounded-lg hover:bg-gray-50 transition-colors"
            title="CSV olarak indir"
          >
            <Download size={16} className="text-foreground-light" />
          </button>
        </div>
        <CityHeatmap data={cityStats} />
      </div>
    </div>
  );
}

/* ── Tenders Tab ───────────────────────────────── */

function TendersTab({
  chartData,
  timeRange,
  setTimeRange,
  sectorStats,
  cityStats,
  dailyStats,
}: {
  chartData: DailyTenderStat[];
  timeRange: TimeRange;
  setTimeRange: (v: TimeRange) => void;
  sectorStats: ReturnType<typeof generateSectorStats>;
  cityStats: ReturnType<typeof generateCityStats>;
  dailyStats: DailyTenderStat[];
}) {
  const totalSectorCount = sectorStats.reduce((s, d) => s + d.count, 0);

  return (
    <div className="space-y-6">
      {/* Budget trend */}
      <div className="bg-white rounded-xl border border-border p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-lg font-bold text-foreground">
            Bütçe Trendi
          </h2>
          <div className="flex items-center gap-2">
            <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
            <button
              onClick={() =>
                exportToCSV(
                  dailyStats.map((d) => ({
                    Tarih: d.date,
                    "İhale Sayısı": d.count,
                    "Toplam Bütçe (₺)": d.totalBudget,
                  })),
                  "butce-trendi"
                )
              }
              className="p-2 border border-border rounded-lg hover:bg-gray-50 transition-colors"
              title="CSV olarak indir"
            >
              <Download size={16} className="text-foreground-light" />
            </button>
          </div>
        </div>
        <div className="h-[220px]">
          <LineChart
            data={chartData}
            dataKey="totalBudget"
            color="#f97316"
            height={220}
            formatValue={(v) => formatCurrency(v)}
          />
        </div>
      </div>

      {/* Sector detail table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">
            Sektörel Detay Tablosu
          </h2>
          <button
            onClick={() =>
              exportToCSV(
                sectorStats.map((s) => ({
                  Sektör: s.sector,
                  "İhale Sayısı": s.count,
                  "Toplam Bütçe (₺)": s.totalBudget,
                  "Ortalama Bütçe (₺)": s.avgBudget,
                  "Pay (%)": Number(((s.count / totalSectorCount) * 100).toFixed(1)),
                })),
                "sektor-detay"
              )
            }
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download size={14} />
            CSV İndir
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-foreground-light">
                  Sektör
                </th>
                <th className="px-4 py-3 text-right font-medium text-foreground-light">
                  İhale Sayısı
                </th>
                <th className="px-4 py-3 text-right font-medium text-foreground-light">
                  Toplam Bütçe
                </th>
                <th className="px-4 py-3 text-right font-medium text-foreground-light">
                  Ort. Bütçe
                </th>
                <th className="px-4 py-3 text-right font-medium text-foreground-light">
                  Pay
                </th>
              </tr>
            </thead>
            <tbody>
              {sectorStats
                .sort((a, b) => b.count - a.count)
                .map((s) => (
                  <tr
                    key={s.sector}
                    className="border-t border-border hover:bg-blue-50/30"
                  >
                    <td className="px-4 py-3 font-medium text-foreground flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-sm shrink-0"
                        style={{ backgroundColor: s.color }}
                      />
                      {s.sector}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {s.count.toLocaleString("tr-TR")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatCurrency(s.totalBudget)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatCurrency(s.avgBudget)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-primary">
                      %{((s.count / totalSectorCount) * 100).toFixed(1)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* City ranking table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">
            İl Bazlı Sıralama
          </h2>
          <button
            onClick={() =>
              exportToCSV(
                cityStats.map((c) => ({
                  İl: c.city,
                  "İhale Sayısı": c.count,
                  "Toplam Bütçe (₺)": c.totalBudget,
                })),
                "il-bazli-siralama"
              )
            }
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download size={14} />
            CSV İndir
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-foreground-light w-10">
                  #
                </th>
                <th className="px-4 py-3 text-left font-medium text-foreground-light">
                  İl
                </th>
                <th className="px-4 py-3 text-right font-medium text-foreground-light">
                  İhale Sayısı
                </th>
                <th className="px-4 py-3 text-right font-medium text-foreground-light">
                  Toplam Bütçe
                </th>
                <th className="px-4 py-3 font-medium text-foreground-light w-40">
                  Yoğunluk
                </th>
              </tr>
            </thead>
            <tbody>
              {cityStats.map((c, idx) => (
                <tr
                  key={c.city}
                  className="border-t border-border hover:bg-blue-50/30"
                >
                  <td className="px-4 py-3 text-foreground-light">
                    {idx + 1}
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {c.city}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {c.count.toLocaleString("tr-TR")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatCurrency(c.totalBudget)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-primary rounded-full h-2 transition-all"
                        style={{ width: `${c.intensity * 100}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── Users Tab ─────────────────────────────────── */

function UsersTab({
  userActivity,
  topSearchTerms,
  topViewedTenders,
}: {
  userActivity: ReturnType<typeof generateUserActivity>;
  topSearchTerms: ReturnType<typeof generateTopSearchTerms>;
  topViewedTenders: ReturnType<typeof generateTopViewedTenders>;
}) {
  return (
    <div className="space-y-6">
      {/* Activity chart */}
      <div className="bg-white rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              Kullanıcı Aktivitesi
            </h2>
            <p className="text-xs text-foreground-light">
              Son 30 gün — giriş, arama ve sayfa görüntüleme
            </p>
          </div>
          <button
            onClick={() =>
              exportToCSV(
                userActivity.map((d) => ({
                  Tarih: d.date,
                  "Giriş Sayısı": d.loginCount,
                  "Arama Sayısı": d.searchCount,
                  "Sayfa Görüntüleme": d.pageViews,
                })),
                "kullanici-aktivite"
              )
            }
            className="p-2 border border-border rounded-lg hover:bg-gray-50 transition-colors"
            title="CSV olarak indir"
          >
            <Download size={16} className="text-foreground-light" />
          </button>
        </div>
        <div className="flex gap-4 mb-3">
          <span className="flex items-center gap-1.5 text-xs text-foreground-light">
            <span className="w-3 h-0.5 bg-[#1a56db] rounded" />
            Giriş
          </span>
          <span className="flex items-center gap-1.5 text-xs text-foreground-light">
            <span className="w-3 h-0.5 bg-[#f97316] rounded" />
            Arama
          </span>
          <span className="flex items-center gap-1.5 text-xs text-foreground-light">
            <span className="w-3 h-0.5 bg-[#10b981] rounded" />
            Sayfa Görüntüleme
          </span>
        </div>
        <div className="h-[200px]">
          <LineChart data={userActivity} dataKey="loginCount" color="#1a56db" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top search terms */}
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Search size={18} className="text-primary" />
              En Çok Aranan Terimler
            </h2>
            <button
              onClick={() =>
                exportToCSV(
                  topSearchTerms.map((t) => ({
                    "Arama Terimi": t.term,
                    Adet: t.count,
                    "Değişim (%)": t.change,
                  })),
                  "arama-terimleri"
                )
              }
              className="p-1.5 border border-border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download size={14} className="text-foreground-light" />
            </button>
          </div>
          <div className="divide-y divide-border">
            {topSearchTerms.map((term, idx) => (
              <div
                key={term.term}
                className="flex items-center gap-3 px-5 py-3 hover:bg-blue-50/30"
              >
                <span className="text-xs text-foreground-light w-5">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {term.term}
                  </p>
                </div>
                <span className="text-sm font-semibold text-foreground">
                  {term.count.toLocaleString("tr-TR")}
                </span>
                <span
                  className={`flex items-center gap-0.5 text-xs font-medium ${
                    term.change >= 0 ? "text-accent" : "text-red-500"
                  }`}
                >
                  {term.change >= 0 ? (
                    <ArrowUpRight size={12} />
                  ) : (
                    <ArrowDownRight size={12} />
                  )}
                  %{Math.abs(term.change).toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top viewed tenders */}
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Eye size={18} className="text-primary" />
              En Çok Görüntülenen İhaleler
            </h2>
            <button
              onClick={() =>
                exportToCSV(
                  topViewedTenders.map((t) => ({
                    "İhale Adı": t.title,
                    Kurum: t.institution,
                    Görüntülenme: t.views,
                  })),
                  "en-cok-goruntulenen"
                )
              }
              className="p-1.5 border border-border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download size={14} className="text-foreground-light" />
            </button>
          </div>
          <div className="divide-y divide-border">
            {topViewedTenders.map((tender, idx) => (
              <div
                key={tender.tenderId}
                className="flex items-center gap-3 px-5 py-3 hover:bg-blue-50/30"
              >
                <span className="text-xs text-foreground-light w-5">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {tender.title}
                  </p>
                  <p className="text-xs text-foreground-light truncate">
                    {tender.institution}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-sm font-semibold text-foreground shrink-0">
                  <Eye size={14} className="text-foreground-light" />
                  {tender.views.toLocaleString("tr-TR")}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Comparison Tab ────────────────────────────── */

function ComparisonTab({
  periodComparison,
}: {
  periodComparison: ReturnType<typeof generatePeriodComparison>;
}) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Calendar size={20} className="text-primary" />
              Karşılaştırmalı Dönem Analizi
            </h2>
            <p className="text-xs text-foreground-light mt-1">
              Bu ay vs. geçen ay karşılaştırması
            </p>
          </div>
          <button
            onClick={() =>
              exportToCSV(
                periodComparison.map((p) => ({
                  Metrik: p.metric,
                  "Bu Ay": p.current,
                  "Geçen Ay": p.previous,
                  "Değişim (%)": p.change,
                })),
                "donem-karsilastirma"
              )
            }
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download size={14} />
            CSV İndir
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border">
          {periodComparison.map((item) => {
            const isPositive = item.change >= 0;
            return (
              <div
                key={item.metric}
                className="bg-white p-5 flex flex-col"
              >
                <p className="text-xs text-foreground-light mb-3">
                  {item.metric}
                </p>
                <div className="flex items-end gap-2 mb-2">
                  <p className="text-xl font-bold text-foreground">
                    {item.unit === "₺"
                      ? formatCurrency(item.current)
                      : item.current.toLocaleString("tr-TR")}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-foreground-light">
                    Önceki:{" "}
                    {item.unit === "₺"
                      ? formatCurrency(item.previous)
                      : item.previous.toLocaleString("tr-TR")}
                  </span>
                  <span
                    className={`flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${
                      isPositive
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {isPositive ? (
                      <TrendingUp size={12} />
                    ) : (
                      <TrendingDown size={12} />
                    )}
                    %{Math.abs(item.change).toFixed(1)}
                  </span>
                </div>
                {/* Visual bar comparison */}
                <div className="mt-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-foreground-light w-12">
                      Bu ay
                    </span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-primary rounded-full h-2"
                        style={{
                          width: `${Math.min(100, (item.current / Math.max(item.current, item.previous)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-foreground-light w-12">
                      Geçen ay
                    </span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-gray-400 rounded-full h-2"
                        style={{
                          width: `${Math.min(100, (item.previous / Math.max(item.current, item.previous)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
