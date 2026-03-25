"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BarChart3, Download } from "lucide-react";
import PriceTrendChart from "@/components/price-index/PriceTrendChart";
import RegionalBarChart from "@/components/price-index/RegionalBarChart";

interface PriceRecord {
  month: string;
  avg: number;
  min: number;
  max: number;
  sampleCount: number;
  city: string | null;
}

interface RegionalData {
  item: string;
  itemLabel: string;
  sector: string;
  unit: string;
  comparisons: Array<{ city: string; avg: number; min: number; max: number; sampleCount: number }>;
}

function formatTRY(val: number) {
  return val.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ItemDetailClient() {
  const params = useParams();
  const item = params.item as string;

  const [trendData, setTrendData] = useState<PriceRecord[]>([]);
  const [regional, setRegional] = useState<RegionalData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // We need sector to fetch trend; get it from regional data first
      const [regionalRes] = await Promise.all([
        fetch(`/api/price-index/compare?item=${item}`),
      ]);

      if (regionalRes.ok) {
        const r = await regionalRes.json();
        setRegional(r);

        // Now fetch trend with sector
        const trendRes = await fetch(`/api/price-index/trends?sector=${r.sector}&item=${item}&period=12`);
        if (trendRes.ok) {
          setTrendData(await trendRes.json());
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [item]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Yükleniyor...</div>;

  const nationalTrend = trendData.filter((d) => !d.city);
  const label = regional?.itemLabel || item;
  const unit = regional?.unit || "birim";

  // Fiyat değişimi
  let change = 0;
  if (nationalTrend.length >= 2) {
    const latest = nationalTrend[nationalTrend.length - 1].avg;
    const prev = nationalTrend[nationalTrend.length - 2].avg;
    change = ((latest - prev) / prev) * 100;
  }

  const latestPrice = nationalTrend.length > 0 ? nationalTrend[nationalTrend.length - 1] : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/fiyat-endeksi" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft size={16} />
          Fiyat Endeksi
        </Link>

        {/* Header */}
        <div className="bg-white rounded-xl border p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <BarChart3 size={24} className="text-blue-600" />
                {label}
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Birim: {unit} | Sektör: {regional?.sector}
              </p>
            </div>
            <a
              href={`/api/price-index/export?sector=${regional?.sector || ""}`}
              className="inline-flex items-center gap-2 border text-sm px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50"
            >
              <Download size={14} />
              CSV
            </a>
          </div>

          {latestPrice && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
              <div>
                <span className="text-sm text-gray-500">Ortalama</span>
                <p className="text-xl font-bold text-gray-900">{formatTRY(latestPrice.avg)} ₺</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Minimum</span>
                <p className="text-xl font-bold text-green-600">{formatTRY(latestPrice.min)} ₺</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Maksimum</span>
                <p className="text-xl font-bold text-red-600">{formatTRY(latestPrice.max)} ₺</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Aylık Değişim</span>
                <p className={`text-xl font-bold ${change >= 0 ? "text-red-600" : "text-green-600"}`}>
                  {change >= 0 ? "+" : ""}{change.toFixed(1)}%
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Trend Chart */}
        {nationalTrend.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">12 Aylık Fiyat Trendi</h2>
            <PriceTrendChart data={nationalTrend} unit={unit} />
          </div>
        )}

        {/* Regional */}
        {regional && regional.comparisons.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">İl Bazlı Karşılaştırma</h2>
            <RegionalBarChart
              data={regional.comparisons}
              unit={unit}
            />

            {/* Table */}
            <div className="bg-white rounded-xl border overflow-hidden mt-4">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">Şehir</th>
                    <th className="text-right px-3 py-2.5 text-xs font-medium text-gray-500 uppercase">Ortalama</th>
                    <th className="text-right px-3 py-2.5 text-xs font-medium text-gray-500 uppercase">Min</th>
                    <th className="text-right px-3 py-2.5 text-xs font-medium text-gray-500 uppercase">Max</th>
                    <th className="text-center px-3 py-2.5 text-xs font-medium text-gray-500 uppercase">Örneklem</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {[...regional.comparisons].sort((a, b) => a.avg - b.avg).map((c) => (
                    <tr key={c.city} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{c.city}</td>
                      <td className="px-3 py-3 text-right text-sm font-semibold">{formatTRY(c.avg)} ₺</td>
                      <td className="px-3 py-3 text-right text-sm text-green-600">{formatTRY(c.min)} ₺</td>
                      <td className="px-3 py-3 text-right text-sm text-red-600">{formatTRY(c.max)} ₺</td>
                      <td className="px-3 py-3 text-center text-xs text-gray-500">{c.sampleCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
