"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  BarChart3,
  Globe,
} from "lucide-react";
import PriceTrendChart from "@/components/price-index/PriceTrendChart";
import RegionalBarChart from "@/components/price-index/RegionalBarChart";
import PriceSearchAutocomplete from "@/components/price-index/PriceSearchAutocomplete";
import IndexUpdateBanner from "@/components/price-index/IndexUpdateBanner";

interface PriceItem {
  id: string;
  item: string;
  itemLabel: string;
  sector: string;
  unit: string;
  avgPrice: string;
  minPrice: string;
  maxPrice: string;
  sampleCount: number;
}

interface TrendData {
  id: string;
  item: string;
  itemLabel: string;
  sector: string;
  prices: Array<{ month: string; avg: number; min: number; max: number }>;
}

interface RegionalData {
  item: string;
  itemLabel: string;
  sector: string;
  unit: string;
  comparisons: Array<{ city: string; avg: number; min: number; max: number; sampleCount: number }>;
}

interface Stats {
  totalItems: number;
  totalRecords: number;
  totalSamples: number;
  latestMonth: string | null;
}

const SECTORS = [
  { value: "", label: "Tüm Sektörler" },
  { value: "YAPIM", label: "Yapım İşleri" },
  { value: "HIZMET", label: "Hizmet Alımı" },
  { value: "MAL_ALIMI", label: "Mal Alımı" },
];

function formatTRY(val: string | number) {
  return Number(val).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function FiyatEndeksiClient() {
  const [sector, setSector] = useState("");
  const [prices, setPrices] = useState<PriceItem[]>([]);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [regionals, setRegionals] = useState<RegionalData[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTrend, setSelectedTrend] = useState<TrendData | null>(null);
  const [selectedRegional, setSelectedRegional] = useState<RegionalData | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = sector ? `&sector=${sector}` : "";
      const [priceRes, trendRes, regionalRes, statsRes] = await Promise.all([
        fetch(`/api/price-index?action=seed`).then(() => fetch(`/api/price-index?${params}`)),
        fetch(`/api/price-index/trends?${params}`),
        fetch(`/api/price-index/compare?${params}`),
        fetch("/api/price-index?action=stats"),
      ]);

      if (priceRes.ok) setPrices(await priceRes.json());
      if (trendRes.ok) {
        const t = await trendRes.json();
        setTrends(t);
        if (t.length > 0 && !selectedTrend) setSelectedTrend(t[0]);
      }
      if (regionalRes.ok) {
        const r = await regionalRes.json();
        setRegionals(r);
        if (r.length > 0 && !selectedRegional) setSelectedRegional(r[0]);
      }
      if (statsRes.ok) setStats(await statsRes.json());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [sector]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSearchSelect = (result: { item: string; itemLabel: string; sector: string }) => {
    setSector(result.sector);
    // Find trend for this item
    const trend = trends.find((t) => t.item === result.item);
    if (trend) setSelectedTrend(trend);
    const regional = regionals.find((r) => r.item === result.item);
    if (regional) setSelectedRegional(regional);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <BarChart3 className="text-blue-600" size={32} />
              İhale Fiyat Endeksi
            </h1>
            <p className="text-gray-500 mt-1">
              Sektörel birim fiyatlar, trendler ve bölgesel karşılaştırmalar
            </p>
          </div>
          <a
            href={`/api/price-index/export${sector ? `?sector=${sector}` : ""}`}
            className="inline-flex items-center gap-2 border border-blue-200 bg-blue-50 text-blue-700 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-100"
          >
            <Download size={16} />
            CSV İndir
          </a>
        </div>

        {/* Banner */}
        {stats && (
          <div className="mb-6">
            <IndexUpdateBanner
              totalSamples={stats.totalSamples}
              totalItems={stats.totalItems}
              latestMonth={stats.latestMonth || undefined}
            />
          </div>
        )}

        {/* Search + Sector Filter */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="sm:col-span-2">
            <PriceSearchAutocomplete sector={sector || undefined} onSelect={handleSearchSelect} />
          </div>
          <div className="flex gap-1">
            {SECTORS.map((s) => (
              <button
                key={s.value}
                onClick={() => setSector(s.value)}
                className={`flex-1 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  sector === s.value
                    ? "bg-blue-600 text-white"
                    : "bg-white border text-gray-600 hover:bg-gray-50"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-500">Yükleniyor...</div>
        ) : (
          <>
            {/* Price Table */}
            <div className="bg-white rounded-xl border overflow-hidden mb-6">
              <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 text-sm">
                  Güncel Birim Fiyatlar ({prices.length} kalem)
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">Kalem</th>
                      <th className="text-center px-3 py-2.5 text-xs font-medium text-gray-500 uppercase">Birim</th>
                      <th className="text-right px-3 py-2.5 text-xs font-medium text-gray-500 uppercase">Ort. Fiyat</th>
                      <th className="text-right px-3 py-2.5 text-xs font-medium text-gray-500 uppercase">Min</th>
                      <th className="text-right px-3 py-2.5 text-xs font-medium text-gray-500 uppercase">Max</th>
                      <th className="text-center px-3 py-2.5 text-xs font-medium text-gray-500 uppercase">Örneklem</th>
                      <th className="text-center px-3 py-2.5 text-xs font-medium text-gray-500 uppercase">Detay</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {prices.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900">{p.itemLabel}</p>
                          <p className="text-xs text-gray-400">{p.sector}</p>
                        </td>
                        <td className="px-3 py-3 text-center text-sm text-gray-600">{p.unit}</td>
                        <td className="px-3 py-3 text-right text-sm font-semibold text-gray-900">
                          {formatTRY(p.avgPrice)} ₺
                        </td>
                        <td className="px-3 py-3 text-right text-sm text-green-600">
                          {formatTRY(p.minPrice)} ₺
                        </td>
                        <td className="px-3 py-3 text-right text-sm text-red-600">
                          {formatTRY(p.maxPrice)} ₺
                        </td>
                        <td className="px-3 py-3 text-center text-xs text-gray-500">{p.sampleCount}</td>
                        <td className="px-3 py-3 text-center">
                          <Link
                            href={`/fiyat-endeksi/${p.item}`}
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                          >
                            Detay →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Trend Charts */}
            {trends.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <TrendingUp size={20} className="text-blue-600" />
                    Fiyat Trendleri (12 Aylık)
                  </h2>
                </div>

                {/* Trend selector */}
                <div className="flex gap-2 overflow-x-auto mb-4 pb-1">
                  {trends.slice(0, 8).map((t) => (
                    <button
                      key={t.item}
                      onClick={() => setSelectedTrend(t)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                        selectedTrend?.item === t.item
                          ? "bg-blue-600 text-white"
                          : "bg-white border text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {t.itemLabel}
                    </button>
                  ))}
                </div>

                {selectedTrend && (
                  <PriceTrendChart
                    data={selectedTrend.prices}
                    unit={prices.find((p) => p.item === selectedTrend.item)?.unit || "birim"}
                    title={`${selectedTrend.itemLabel} — Fiyat Trendi`}
                  />
                )}
              </div>
            )}

            {/* Regional Comparison */}
            {regionals.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Globe size={20} className="text-indigo-600" />
                    Bölgesel Karşılaştırma
                  </h2>
                </div>

                <div className="flex gap-2 overflow-x-auto mb-4 pb-1">
                  {regionals.slice(0, 8).map((r) => (
                    <button
                      key={r.item}
                      onClick={() => setSelectedRegional(r)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                        selectedRegional?.item === r.item
                          ? "bg-indigo-600 text-white"
                          : "bg-white border text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {r.itemLabel}
                    </button>
                  ))}
                </div>

                {selectedRegional && (
                  <RegionalBarChart
                    data={selectedRegional.comparisons}
                    unit={selectedRegional.unit}
                    title={`${selectedRegional.itemLabel} — İl Bazlı Karşılaştırma`}
                  />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
