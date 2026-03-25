"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, Calendar, Clock } from "lucide-react";
import HealthGauge from "@/components/financial-health/HealthGauge";
import SubscoreBar from "@/components/financial-health/SubscoreBar";
import RiskBadge from "@/components/financial-health/RiskBadge";
import { SUBSCORE_LABELS, getRecommendations } from "@/lib/financial-health-client";

interface ScoreData {
  id: string;
  targetName: string;
  targetTaxNumber: string | null;
  overallScore: number;
  subscores: Record<string, number>;
  riskLevel: string;
  sectorBenchmark: number | null;
  calculatedAt: string;
  validUntil: string;
}

export default function ScoreDetailClient() {
  const params = useParams();
  const id = params.id as string;
  const [score, setScore] = useState<ScoreData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/financial-health/score?id=${id}`);
        if (res.ok) setScore(await res.json());
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Yükleniyor...</div>;
  if (!score) return <div className="min-h-screen flex items-center justify-center text-gray-500">Skor bulunamadı</div>;

  const subscores = score.subscores;
  const recommendations = getRecommendations(subscores as Record<string, number>);
  const validDate = new Date(score.validUntil);
  const isExpired = validDate < new Date();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <Link href="/mali-skor" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft size={16} />
          Mali Sağlık Skoru
        </Link>

        {/* Header */}
        <div className="bg-white rounded-xl border p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Building2 size={20} className="text-blue-600" />
                {score.targetName}
              </h1>
              {score.targetTaxNumber && (
                <p className="text-sm text-gray-500 mt-1">VKN: {score.targetTaxNumber}</p>
              )}
            </div>
            <RiskBadge level={score.riskLevel} size="lg" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="flex justify-center relative">
              <HealthGauge score={score.overallScore} size={200} />
            </div>

            <div className="space-y-4">
              {score.sectorBenchmark && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Sektör Ortalaması ile Karşılaştırma</p>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-gray-900">{score.overallScore}</span>
                    <span className="text-gray-400">vs</span>
                    <span className="text-2xl font-bold text-gray-500">{score.sectorBenchmark}</span>
                  </div>
                  <p className={`text-sm font-medium mt-1 ${score.overallScore >= score.sectorBenchmark ? "text-green-600" : "text-red-600"}`}>
                    {score.overallScore >= score.sectorBenchmark
                      ? `Sektör ortalamasının ${score.overallScore - score.sectorBenchmark} puan üstünde`
                      : `Sektör ortalamasının ${score.sectorBenchmark - score.overallScore} puan altında`}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  Hesaplama: {new Date(score.calculatedAt).toLocaleDateString("tr-TR")}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {isExpired ? "Süresi dolmuş" : `Geçerli: ${validDate.toLocaleDateString("tr-TR")}`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Subscores */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

          <div className="bg-white rounded-xl border p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Değerlendirme & Öneriler</h2>
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

            {/* Score breakdown */}
            <div className="mt-6 pt-4 border-t">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Skor Ağırlıkları</h3>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(SUBSCORE_LABELS).map(([key, { label, weight }]) => (
                  <div key={key} className="flex items-center justify-between text-xs text-gray-500 bg-gray-50 rounded px-2 py-1.5">
                    <span className="truncate">{label}</span>
                    <span className="font-medium text-gray-700 ml-1">{weight}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
