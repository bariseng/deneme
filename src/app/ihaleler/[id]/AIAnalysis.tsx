"use client";

import { useState, useCallback } from "react";
import {
  Sparkles,
  Brain,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  DollarSign,
  FileText,
  TrendingUp,
  Shield,
  Zap,
} from "lucide-react";
import {
  analyzeTenderRisk,
  summarizeDocument,
  estimatePrice,
  type AIRiskAnalysis,
  type AIDocSummary,
  type AIPriceEstimate,
} from "@/lib/ai-engine";
import { type Tender } from "@/lib/data";
import { formatCurrency } from "@/lib/format";

interface Props {
  tender: Tender;
}

export default function AIAnalysis({ tender }: Props) {
  const [riskAnalysis, setRiskAnalysis] = useState<AIRiskAnalysis | null>(null);
  const [docSummary, setDocSummary] = useState<AIDocSummary | null>(null);
  const [priceEstimate, setPriceEstimate] = useState<AIPriceEstimate | null>(null);
  const [loadingRisk, setLoadingRisk] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingPrice, setLoadingPrice] = useState(false);

  const handleRiskAnalysis = useCallback(async () => {
    setLoadingRisk(true);
    const result = await analyzeTenderRisk(tender);
    setRiskAnalysis(result);
    setLoadingRisk(false);
  }, [tender]);

  const handleSummarize = useCallback(async () => {
    setLoadingSummary(true);
    const result = await summarizeDocument(tender);
    setDocSummary(result);
    setLoadingSummary(false);
  }, [tender]);

  const handlePriceEstimate = useCallback(async () => {
    setLoadingPrice(true);
    const result = await estimatePrice(tender);
    setPriceEstimate(result);
    setLoadingPrice(false);
  }, [tender]);

  const recIcon = (rec: AIRiskAnalysis["recommendation"]) => {
    if (rec === "katıl") return <CheckCircle2 size={20} className="text-accent" />;
    if (rec === "dikkatli") return <AlertTriangle size={20} className="text-yellow-500" />;
    return <XCircle size={20} className="text-red-500" />;
  };

  const recColor = (rec: AIRiskAnalysis["recommendation"]) => {
    if (rec === "katıl") return "bg-green-100 text-green-700 border-green-200";
    if (rec === "dikkatli") return "bg-yellow-100 text-yellow-700 border-yellow-200";
    return "bg-red-100 text-red-700 border-red-200";
  };

  const recLabel = (rec: AIRiskAnalysis["recommendation"]) => {
    if (rec === "katıl") return "Katılım Önerilir";
    if (rec === "dikkatli") return "Dikkatli Değerlendirin";
    return "Yüksek Risk";
  };

  return (
    <section className="bg-white rounded-xl border border-border p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <Sparkles size={20} className="text-primary" />
        AI Analiz Araçları
      </h2>

      {/* Action buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <button
          onClick={handleRiskAnalysis}
          disabled={loadingRisk}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-primary/5 hover:bg-primary/10 text-primary border border-primary/20 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {loadingRisk ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Shield size={16} />
          )}
          {loadingRisk ? "Analiz ediliyor..." : "Risk Analizi"}
        </button>
        <button
          onClick={handleSummarize}
          disabled={loadingSummary}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-accent/5 hover:bg-accent/10 text-accent border border-accent/20 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {loadingSummary ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <FileText size={16} />
          )}
          {loadingSummary ? "Özetleniyor..." : "Şartname Özeti"}
        </button>
        <button
          onClick={handlePriceEstimate}
          disabled={loadingPrice}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-secondary/5 hover:bg-secondary/10 text-secondary border border-secondary/20 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {loadingPrice ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <DollarSign size={16} />
          )}
          {loadingPrice ? "Hesaplanıyor..." : "Fiyat Tahmini"}
        </button>
      </div>

      {/* Risk Analysis Result */}
      {riskAnalysis && (
        <div className="border border-border rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {recIcon(riskAnalysis.recommendation)}
              <span className="font-bold text-foreground">
                Risk/Fırsat Analizi
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full border ${recColor(riskAnalysis.recommendation)}`}
              >
                {recLabel(riskAnalysis.recommendation)}
              </span>
              <span className="text-sm font-bold text-primary">
                {riskAnalysis.score}/100
              </span>
            </div>
          </div>

          {/* Score bar */}
          <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
            <div
              className={`h-2 rounded-full transition-all ${
                riskAnalysis.score >= 65
                  ? "bg-accent"
                  : riskAnalysis.score >= 40
                    ? "bg-yellow-500"
                    : "bg-red-500"
              }`}
              style={{ width: `${riskAnalysis.score}%` }}
            />
          </div>

          <p className="text-sm text-foreground-light mb-3">
            {riskAnalysis.summary}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold text-accent mb-1.5 flex items-center gap-1">
                <CheckCircle2 size={12} />
                Güçlü Yönler
              </p>
              <ul className="space-y-1">
                {riskAnalysis.strengths.map((s, i) => (
                  <li key={i} className="text-xs text-foreground-light flex items-start gap-1.5">
                    <span className="text-accent mt-0.5">+</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-red-500 mb-1.5 flex items-center gap-1">
                <AlertTriangle size={12} />
                Riskler
              </p>
              <ul className="space-y-1">
                {riskAnalysis.risks.map((r, i) => (
                  <li key={i} className="text-xs text-foreground-light flex items-start gap-1.5">
                    <span className="text-red-500 mt-0.5">-</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Document Summary Result */}
      {docSummary && (
        <div className="border border-border rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={18} className="text-accent" />
            <span className="font-bold text-foreground">
              Şartname Özeti
            </span>
            <span className="ml-auto text-xs text-foreground-light bg-background-alt px-2 py-0.5 rounded">
              Tahmini iş yükü: {docSummary.estimatedEffort}
            </span>
          </div>

          <ol className="space-y-2 mb-3">
            {docSummary.bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground-light">
                <span className="w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center text-[10px] font-bold text-primary shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {b}
              </li>
            ))}
          </ol>

          <div className="flex flex-wrap gap-3">
            {docSummary.keyDates.map((kd, i) => (
              <div
                key={i}
                className="bg-background-alt rounded-lg px-3 py-2 text-xs"
              >
                <span className="text-foreground-light">{kd.label}: </span>
                <span className="font-semibold text-foreground">
                  {kd.date}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Price Estimate Result */}
      {priceEstimate && (
        <div className="border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={18} className="text-secondary" />
            <span className="font-bold text-foreground">
              AI Fiyat Tahmini
            </span>
            <span className="ml-auto text-xs text-foreground-light">
              Güven: %{priceEstimate.confidence}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="bg-background-alt rounded-lg p-3 text-center">
              <p className="text-[10px] text-foreground-light">Min</p>
              <p className="text-sm font-bold text-foreground">
                {formatCurrency(priceEstimate.estimatedMin)}
              </p>
            </div>
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-center">
              <p className="text-[10px] text-primary font-medium">Önerilen</p>
              <p className="text-sm font-bold text-primary">
                {formatCurrency(priceEstimate.recommended)}
              </p>
            </div>
            <div className="bg-background-alt rounded-lg p-3 text-center">
              <p className="text-[10px] text-foreground-light">Max</p>
              <p className="text-sm font-bold text-foreground">
                {formatCurrency(priceEstimate.estimatedMax)}
              </p>
            </div>
          </div>

          <ul className="space-y-1">
            {priceEstimate.basis.map((b, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-foreground-light">
                <CheckCircle2 size={12} className="text-accent shrink-0 mt-0.5" />
                {b}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* CTA when no analysis yet */}
      {!riskAnalysis && !docSummary && !priceEstimate && (
        <p className="text-xs text-foreground-light text-center py-2">
          Yukarıdaki butonlardan birini tıklayarak AI destekli analiz başlatın
        </p>
      )}
    </section>
  );
}
