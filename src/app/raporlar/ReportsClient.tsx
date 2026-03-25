"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart3,
  TrendingUp,
  MapPin,
  Download,
  Calendar,
  Loader2,
} from "lucide-react";

interface DailyStat {
  id: string;
  date: string;
  totalTenders: number;
  newTenders: number;
  closingTenders: number;
  totalBudget: string;
  avgBudget: string;
  activeUsers: number;
  totalSearches: number;
}

interface SectorStat {
  sector: string;
  tenderCount: number;
  totalBudget: string;
}

interface CityStat {
  city: string;
  count: number;
  totalBudget: string;
}

type Period = "7d" | "30d" | "90d";

export default function ReportsClient() {
  const [period, setPeriod] = useState<Period>("30d");
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [sectorStats, setSectorStats] = useState<SectorStat[]>([]);
  const [cityStats, setCityStats] = useState<CityStat[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
      const from = new Date();
      from.setDate(from.getDate() - days);

      const [dailyRes, sectorRes, cityRes] = await Promise.all([
        fetch(`/api/stats/daily?from=${from.toISOString()}`),
        fetch("/api/stats/sectors"),
        fetch("/api/stats/cities"),
      ]);

      const dailyData = await dailyRes.json();
      const sectorData = await sectorRes.json();
      const cityData = await cityRes.json();

      if (dailyData.success) setDailyStats(dailyData.data);
      if (sectorData.success) setSectorStats(sectorData.data);
      if (cityData.success) setCityStats(cityData.data);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const maxTenders = Math.max(...dailyStats.map((d) => d.newTenders), 1);
  const maxSectorCount = Math.max(...sectorStats.map((s) => s.tenderCount), 1);
  const maxCityCount = Math.max(...cityStats.map((c) => c.count), 1);

  const sectorColors = [
    "#1a56db", "#f97316", "#10b981", "#8b5cf6",
    "#ec4899", "#06b6d4", "#eab308", "#ef4444",
  ];

  return (
    <div className="bg-background-alt min-h-screen">
      <div className="bg-gradient-to-r from-background-dark to-primary py-8 md:py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Raporlar</h1>
              <p className="text-blue-200 text-sm mt-1">İhale istatistikleri ve analitik</p>
            </div>
            <a
              href="/api/stats/export"
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Download size={16} />
              CSV Export
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Period selector */}
        <div className="flex items-center gap-2 mb-6">
          <Calendar size={16} className="text-foreground-light" />
          {([
            { id: "7d", label: "Son 7 Gün" },
            { id: "30d", label: "Son 30 Gün" },
            { id: "90d", label: "Son 90 Gün" },
          ] as { id: Period; label: string }[]).map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                period === p.id
                  ? "bg-primary text-white"
                  : "bg-white text-foreground-light border border-border hover:border-primary"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Daily trends chart */}
            <div className="bg-white rounded-xl border border-border p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={18} className="text-primary" />
                <h2 className="text-lg font-bold text-foreground">Günlük Yeni İhale Trendi</h2>
              </div>
              <div className="overflow-x-auto">
                <svg viewBox={`0 0 ${Math.max(dailyStats.length * 20, 600)} 200`} className="w-full h-48">
                  {dailyStats.map((stat, i) => {
                    const barHeight = (stat.newTenders / maxTenders) * 160;
                    const x = i * 20 + 10;
                    return (
                      <g key={stat.id}>
                        <rect
                          x={x}
                          y={180 - barHeight}
                          width={14}
                          height={barHeight}
                          rx={2}
                          fill="#1a56db"
                          opacity={0.8}
                        />
                        {i % 5 === 0 && (
                          <text x={x + 7} y={196} textAnchor="middle" fontSize="8" fill="#64748b">
                            {new Date(stat.date).getDate()}/{new Date(stat.date).getMonth() + 1}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sector distribution */}
              <div className="bg-white rounded-xl border border-border p-5">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 size={18} className="text-primary" />
                  <h2 className="text-lg font-bold text-foreground">Sektörel Dağılım</h2>
                </div>
                <div className="space-y-3">
                  {sectorStats.slice(0, 8).map((stat, i) => (
                    <div key={stat.sector} className="flex items-center gap-3">
                      <span className="text-xs text-foreground-light w-28 shrink-0 truncate">
                        {stat.sector}
                      </span>
                      <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${(stat.tenderCount / maxSectorCount) * 100}%`,
                            backgroundColor: sectorColors[i % sectorColors.length],
                          }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-foreground w-8 text-right">
                        {stat.tenderCount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* City distribution */}
              <div className="bg-white rounded-xl border border-border p-5">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin size={18} className="text-primary" />
                  <h2 className="text-lg font-bold text-foreground">İl Bazlı Yoğunluk</h2>
                </div>
                <div className="space-y-3">
                  {cityStats.slice(0, 10).map((stat) => (
                    <div key={stat.city} className="flex items-center gap-3">
                      <span className="text-xs text-foreground-light w-24 shrink-0">
                        {stat.city}
                      </span>
                      <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent rounded-full transition-all duration-500"
                          style={{
                            width: `${(stat.count / maxCityCount) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-foreground w-8 text-right">
                        {stat.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Summary stats */}
            {dailyStats.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  {
                    label: "Toplam Yeni İhale",
                    value: dailyStats.reduce((s, d) => s + d.newTenders, 0).toLocaleString("tr-TR"),
                  },
                  {
                    label: "Ort. Günlük İhale",
                    value: Math.round(
                      dailyStats.reduce((s, d) => s + d.newTenders, 0) / dailyStats.length
                    ).toLocaleString("tr-TR"),
                  },
                  {
                    label: "Toplam Aktif Kullanıcı",
                    value: Math.max(...dailyStats.map((d) => d.activeUsers)).toLocaleString("tr-TR"),
                  },
                  {
                    label: "Toplam Arama",
                    value: dailyStats.reduce((s, d) => s + d.totalSearches, 0).toLocaleString("tr-TR"),
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="bg-white rounded-xl border border-border p-4 text-center"
                  >
                    <p className="text-2xl font-bold text-primary">{item.value}</p>
                    <p className="text-xs text-foreground-light mt-1">{item.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
