"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Activity, Search, Clock, TrendingUp } from "lucide-react";
import HealthGauge from "@/components/financial-health/HealthGauge";
import SubscoreBar from "@/components/financial-health/SubscoreBar";
import RiskBadge from "@/components/financial-health/RiskBadge";
import CapacityMeter from "@/components/financial-health/CapacityMeter";
import { SUBSCORE_LABELS, getRecommendations } from "@/lib/financial-health-client";

interface ScoreData {
  id: string;
  overallScore: number;
  subscores: Record<string, number>;
  riskLevel: string;
  sectorBenchmark: number | null;
  calculatedAt: string;
  validUntil: string;
}

interface CapacityData {
  activeTenders: number;
  totalCommitment: number;
  estimatedCapacity: number;
  utilizationPercent: number;
}

interface QueryItem {
  id: string;
  targetCompanyName: string;
  targetTaxNumber: string | null;
  queriedAt: string;
  resultScore: { id: string; overallScore: number; riskLevel: string } | null;
}

export default function MaliSkorClient() {
  const [score, setScore] = useState<ScoreData | null>(null);
  const [capacity, setCapacity] = useState<CapacityData | null>(null);
  const [history, setHistory] = useState<QueryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [noCompany, setNoCompany] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [scoreRes, capRes, histRes] = await Promise.all([
          fetch("/api/financial-health/my-score"),
          fetch("/api/financial-health/capacity"),
          fetch("/api/financial-health/query"),
        ]);

        if (scoreRes.status === 400) {
          setNoCompany(true);
        } else if (scoreRes.ok) {
          setScore(await scoreRes.json());
        }

        if (capRes.ok) setCapacity(await capRes.json());
        if (histRes.ok) setHistory(await histRes.json());
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Yükleniyor...
      </div>
    );
  }

  if (noCompany) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <Activity size={48} className="mx-auto text-gray-300 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Firma Kaydı Gerekli</h1>
          <p className="text-gray-500 mb-6">Mali sağlık skoru hesaplamak için firma kaydınız olmalıdır.</p>
          <Link href="/ayarlar" className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700">
            Firma Bilgilerini Gir
          </Link>
        </div>
      </div>
    );
  }

  const subscores = score?.subscores || {};
  const recommendations = score ? getRecommendations(subscores as Record<string, number>) : [];
  const validDate = score ? new Date(score.validUntil) : null;
  const daysLeft = validDate ? Math.ceil((validDate.getTime() - Date.now()) / 86400000) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Activity size={24} className="text-blue-600" />
              Mali Sağlık Skoru
            </h1>
            <p className="text-gray-500 text-sm mt-1">Firmanızın mali durumu ve risk analizi</p>
          </div>
          <Link
            href="/mali-skor/sorgula"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <Search size={16} />
            Rakip Firma Sorgula
          </Link>
        </div>

        {score && (
          <>
            {/* Score Card */}
            <div className="bg-white rounded-xl border p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                {/* Gauge */}
                <div className="flex justify-center relative">
                  <HealthGauge score={score.overallScore} size={200} />
                </div>

                {/* Info */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <RiskBadge level={score.riskLevel} size="lg" />
                  </div>
                  {score.sectorBenchmark && (
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp size={16} className="text-gray-400" />
                      <span className="text-gray-600">
                        Sektör Ortalaması: <strong>{score.sectorBenchmark}</strong>
                      </span>
                      {score.overallScore > score.sectorBenchmark ? (
                        <span className="text-green-600 text-xs font-medium">
                          (+{score.overallScore - score.sectorBenchmark} yukarıda)
                        </span>
                      ) : (
                        <span className="text-red-600 text-xs font-medium">
                          ({score.overallScore - score.sectorBenchmark} aşağıda)
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Clock size={12} />
                    Geçerlilik: {daysLeft} gün kaldı
                  </div>
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(subscores).slice(0, 4).map(([key, val]) => (
                    <div key={key} className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-gray-900">{val as number}</p>
                      <p className="text-[10px] text-gray-500">{SUBSCORE_LABELS[key]?.label || key}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Subscores */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-xl border p-6">
                <h2 className="font-semibold text-gray-900 mb-5">Alt Skor Detayları</h2>
                <div className="space-y-5">
                  {Object.entries(subscores).map(([key, val]) => (
                    <SubscoreBar
                      key={key}
                      label={SUBSCORE_LABELS[key]?.label || key}
                      score={val as number}
                      weight={SUBSCORE_LABELS[key]?.weight || ""}
                      benchmark={score.sectorBenchmark || undefined}
                    />
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              <div className="space-y-6">
                <div className="bg-white rounded-xl border p-6">
                  <h2 className="font-semibold text-gray-900 mb-4">Öneriler</h2>
                  <ul className="space-y-3">
                    {recommendations.map((r, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                        <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Capacity */}
                {capacity && (
                  <CapacityMeter
                    activeTenders={capacity.activeTenders}
                    totalCommitment={Number(capacity.totalCommitment)}
                    estimatedCapacity={Number(capacity.estimatedCapacity)}
                    utilizationPercent={capacity.utilizationPercent}
                  />
                )}
              </div>
            </div>
          </>
        )}

        {/* Query History */}
        {history.length > 0 && (
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h2 className="font-semibold text-gray-900">Son Sorgularınız</h2>
            </div>
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">Firma</th>
                  <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500 uppercase">Vergi No</th>
                  <th className="text-center px-3 py-2.5 text-xs font-medium text-gray-500 uppercase">Skor</th>
                  <th className="text-center px-3 py-2.5 text-xs font-medium text-gray-500 uppercase">Risk</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">Tarih</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {history.map((q) => (
                  <tr key={q.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {q.resultScore ? (
                        <Link href={`/mali-skor/${q.resultScore.id}`} className="text-blue-600 hover:underline">
                          {q.targetCompanyName}
                        </Link>
                      ) : (
                        q.targetCompanyName
                      )}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-500">{q.targetTaxNumber || "-"}</td>
                    <td className="px-3 py-3 text-center">
                      {q.resultScore ? (
                        <span className="font-bold text-gray-900">{q.resultScore.overallScore}</span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {q.resultScore && <RiskBadge level={q.resultScore.riskLevel} size="sm" />}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-400">
                      {new Date(q.queriedAt).toLocaleDateString("tr-TR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
