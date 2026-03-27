"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Sparkles,
  Brain,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  ArrowRight,
  Building2,
  MapPin,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Zap,
  BarChart3,
} from "lucide-react";
import {
  matchTendersForCompany,
  estimatePrice,
  analyzeTrends,
  type AIMatchedTender,
  type AIPriceEstimate,
  type AITrendAlert,
} from "@/lib/ai-engine";
import type { Tender } from "@/lib/data";
import type { Company } from "@/lib/companies";
import { mapApiTender } from "@/lib/api-client";
import { formatCurrency, formatDateTR } from "@/lib/format";

type Tab = "matching" | "pricing" | "trends";

const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "matching", label: "İhale Eşleştirme", icon: Target },
  { key: "pricing", label: "Fiyat Tahmini", icon: DollarSign },
  { key: "trends", label: "Trend Analizi", icon: TrendingUp },
];

export default function AIFeaturesClient() {
  const [activeTab, setActiveTab] = useState<Tab>("matching");
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/tenders?limit=20&sort=publishDate&order=desc").then((r) => r.json()),
      fetch("/api/integrations/kap?action=search&q=").then((r) => r.json()).catch(() => ({ results: [] })),
    ]).then(([tendersJson, companiesJson]) => {
      setTenders((tendersJson.data ?? []).map(mapApiTender));
      setCompanies(companiesJson.results ?? []);
    });
  }, []);

  return (
    <div className="bg-background-alt min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-background-dark to-primary py-8 md:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Sparkles size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                AI Özellikleri
              </h1>
              <p className="text-blue-200 text-sm">
                Yapay zeka destekli ihale analiz araçları
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-border p-4 flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
              <Target size={20} className="text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">
                Akıllı Eşleştirme
              </p>
              <p className="text-xs text-foreground-light mt-0.5">
                Firma profilinize uygun ihaleleri otomatik bulun
              </p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-border p-4 flex items-start gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
              <DollarSign size={20} className="text-accent" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">
                Fiyat Tahmini
              </p>
              <p className="text-xs text-foreground-light mt-0.5">
                Geçmiş verilere dayalı optimal teklif önerisi
              </p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-border p-4 flex items-start gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center shrink-0">
              <BarChart3 size={20} className="text-secondary" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">
                Trend Analizi
              </p>
              <p className="text-xs text-foreground-light mt-0.5">
                Sektörel trend uyarıları ve piyasa analizi
              </p>
            </div>
          </div>
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

        {activeTab === "matching" && <MatchingTab companies={companies} />}
        {activeTab === "pricing" && <PricingTab tenders={tenders} />}
        {activeTab === "trends" && <TrendsTab />}
      </div>
    </div>
  );
}

/* ── Matching Tab ──────────────────────────────── */

function MatchingTab({ companies }: { companies: Company[] }) {
  const [selectedCompany, setSelectedCompany] = useState(companies[0]?.id ?? "");
  const [results, setResults] = useState<AIMatchedTender[] | null>(null);
  const [loading, setLoading] = useState(false);

  const handleMatch = useCallback(async () => {
    const company = companies.find((c) => c.id === selectedCompany);
    if (!company) return;

    setLoading(true);
    const matches = await matchTendersForCompany(
      company.sectors,
      company.city,
      company.totalTenderAmount / Math.max(1, company.wonTenderCount)
    );
    setResults(matches);
    setLoading(false);
  }, [selectedCompany]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-border p-5">
        <h2 className="text-lg font-bold text-foreground mb-1">
          Otomatik İhale Eşleştirme
        </h2>
        <p className="text-sm text-foreground-light mb-4">
          Firma profilinizi seçin, size en uygun ihaleleri yapay zeka ile bulalım.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={selectedCompany}
            onChange={(e) => {
              setSelectedCompany(e.target.value);
              setResults(null);
            }}
            className="flex-1 h-10 px-3 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.sectors.join(", ")}
              </option>
            ))}
          </select>
          <button
            onClick={handleMatch}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium transition-colors disabled:opacity-50 shrink-0"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Analiz ediliyor...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Eşleştir
              </>
            )}
          </button>
        </div>
      </div>

      {results && (
        <div className="space-y-3">
          <p className="text-sm text-foreground-light">
            <span className="font-semibold text-foreground">
              {results.length} ihale
            </span>{" "}
            firma profilinize uygun bulundu
          </p>

          {results.map((match) => (
            <div
              key={match.tender.id}
              className="bg-white rounded-xl border border-border hover:border-primary/30 hover:shadow-md transition-all p-4 sm:p-5"
            >
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <MatchScoreBadge score={match.matchScore} />
                    <span className="text-xs text-foreground-light">
                      {match.tender.category}
                    </span>
                  </div>
                  <Link
                    href={`/ihaleler/${match.tender.id}`}
                    className="text-base font-semibold text-foreground hover:text-primary transition-colors line-clamp-1"
                  >
                    {match.tender.title}
                  </Link>
                  <p className="text-sm text-foreground-light mt-0.5">
                    {match.tender.institution}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-foreground-light">
                    <span className="flex items-center gap-1">
                      <MapPin size={12} />
                      {match.tender.city}
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign size={12} />
                      {match.tender.estimatedCost}
                    </span>
                    <span>
                      Son başvuru: {formatDateTR(match.tender.deadline)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {match.reasons.map((r, i) => (
                      <span
                        key={i}
                        className="text-[11px] px-2 py-0.5 bg-blue-50 text-primary rounded-full"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center shrink-0">
                  <Link
                    href={`/ihaleler/${match.tender.id}`}
                    className="flex items-center gap-1 text-sm text-primary hover:text-primary-dark font-medium"
                  >
                    Detay
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MatchScoreBadge({ score }: { score: number }) {
  const color =
    score >= 70
      ? "bg-green-100 text-green-700"
      : score >= 40
        ? "bg-yellow-100 text-yellow-700"
        : "bg-red-100 text-red-700";

  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>
      %{score} uyum
    </span>
  );
}

/* ── Pricing Tab ───────────────────────────────── */

function PricingTab({ tenders }: { tenders: Tender[] }) {
  const [selectedTender, setSelectedTender] = useState("");
  const [estimate, setEstimate] = useState<AIPriceEstimate | null>(null);
  const [loading, setLoading] = useState(false);

  const handleEstimate = useCallback(async () => {
    const tender = tenders.find((t) => t.id === selectedTender);
    if (!tender) return;

    setLoading(true);
    const result = await estimatePrice(tender);
    setEstimate(result);
    setLoading(false);
  }, [selectedTender]);

  const tender = tenders.find((t) => t.id === selectedTender);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-border p-5">
        <h2 className="text-lg font-bold text-foreground mb-1">
          AI Fiyat Tahmini
        </h2>
        <p className="text-sm text-foreground-light mb-4">
          Geçmiş ihale verilerine dayalı yapay zeka destekli teklif fiyat önerisi.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={selectedTender}
            onChange={(e) => {
              setSelectedTender(e.target.value);
              setEstimate(null);
            }}
            className="flex-1 h-10 px-3 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">-- İhale seçin --</option>
            {tenders
              .filter((t) => t.status === "active")
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.estimatedCost})
                </option>
              ))}
          </select>
          <button
            onClick={handleEstimate}
            disabled={loading || !selectedTender}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium transition-colors disabled:opacity-50 shrink-0"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Hesaplanıyor...
              </>
            ) : (
              <>
                <Brain size={16} />
                Fiyat Tahmin Et
              </>
            )}
          </button>
        </div>
      </div>

      {estimate && tender && (
        <div className="bg-white rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={20} className="text-primary" />
            <h3 className="text-lg font-bold text-foreground">
              Tahmin Sonucu
            </h3>
            <span className="ml-auto text-xs text-foreground-light">
              Güven: %{estimate.confidence}
            </span>
          </div>

          {/* Price comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-background-alt rounded-lg p-4 text-center">
              <p className="text-xs text-foreground-light mb-1">
                Minimum Teklif
              </p>
              <p className="text-lg font-bold text-foreground">
                {formatCurrency(estimate.estimatedMin)}
              </p>
            </div>
            <div className="bg-primary/5 border-2 border-primary/20 rounded-lg p-4 text-center">
              <p className="text-xs text-primary font-medium mb-1">
                Önerilen Teklif
              </p>
              <p className="text-xl font-bold text-primary">
                {formatCurrency(estimate.recommended)}
              </p>
            </div>
            <div className="bg-background-alt rounded-lg p-4 text-center">
              <p className="text-xs text-foreground-light mb-1">
                Maksimum Teklif
              </p>
              <p className="text-lg font-bold text-foreground">
                {formatCurrency(estimate.estimatedMax)}
              </p>
            </div>
          </div>

          {/* Comparison with estimated cost */}
          <div className="bg-blue-50 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground-light">
                Tahmini Bedel:
              </span>
              <span className="font-semibold text-foreground">
                {tender.estimatedCost}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-foreground-light">
                Önerilen / Tahmini Bedel:
              </span>
              <span className="font-bold text-primary">
                %
                {(
                  (estimate.recommended / tender.estimatedCostValue) *
                  100
                ).toFixed(1)}
              </span>
            </div>
          </div>

          {/* Confidence bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-foreground-light">Tahmin Güveni</span>
              <span className="font-semibold text-foreground">
                %{estimate.confidence}
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all ${
                  estimate.confidence >= 70
                    ? "bg-accent"
                    : estimate.confidence >= 50
                      ? "bg-yellow-500"
                      : "bg-red-500"
                }`}
                style={{ width: `${estimate.confidence}%` }}
              />
            </div>
          </div>

          {/* Analysis basis */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">
              Analiz Temeli
            </h4>
            <ul className="space-y-1.5">
              {estimate.basis.map((b, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-foreground-light"
                >
                  <CheckCircle2
                    size={14}
                    className="text-accent shrink-0 mt-0.5"
                  />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Trends Tab ────────────────────────────────── */

function TrendsTab() {
  const [alerts, setAlerts] = useState<AITrendAlert[] | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = useCallback(async () => {
    setLoading(true);
    const result = await analyzeTrends();
    setAlerts(result);
    setLoading(false);
  }, []);

  const trendIcon = (trend: AITrendAlert["trend"]) => {
    if (trend === "increasing") return <TrendingUp size={18} className="text-accent" />;
    if (trend === "decreasing") return <TrendingDown size={18} className="text-red-500" />;
    return <Minus size={18} className="text-yellow-500" />;
  };

  const trendLabel = (trend: AITrendAlert["trend"]) => {
    if (trend === "increasing") return "Artış";
    if (trend === "decreasing") return "Düşüş";
    return "Sabit";
  };

  const trendColor = (trend: AITrendAlert["trend"]) => {
    if (trend === "increasing") return "bg-green-100 text-green-700";
    if (trend === "decreasing") return "bg-red-100 text-red-700";
    return "bg-yellow-100 text-yellow-700";
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-border p-5">
        <h2 className="text-lg font-bold text-foreground mb-1">
          Sektörel Trend Analizi
        </h2>
        <p className="text-sm text-foreground-light mb-4">
          Yapay zeka ile sektörel ihale trendlerini analiz edin. Hangi sektörler
          büyüyor, hangilerinde daralma var?
        </p>

        {!alerts && (
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Analiz ediliyor...
              </>
            ) : (
              <>
                <BarChart3 size={16} />
                Trend Analizi Başlat
              </>
            )}
          </button>
        )}
      </div>

      {alerts && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {alerts.map((alert) => (
            <div
              key={alert.sector}
              className="bg-white rounded-xl border border-border p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {trendIcon(alert.trend)}
                  <h3 className="font-bold text-foreground">
                    {alert.sector}
                  </h3>
                </div>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full ${trendColor(alert.trend)}`}
                >
                  {trendLabel(alert.trend)}{" "}
                  {alert.changePercent > 0 ? "+" : ""}
                  %{alert.changePercent.toFixed(1)}
                </span>
              </div>

              <p className="text-sm text-foreground-light leading-relaxed mb-3">
                {alert.insight}
              </p>

              <div className="flex items-center justify-between text-xs text-foreground-light">
                <span>{alert.period}</span>
                {alert.trend === "increasing" && (
                  <span className="text-accent font-medium">
                    Fırsat potansiyeli yüksek
                  </span>
                )}
                {alert.trend === "decreasing" && (
                  <span className="text-red-500 font-medium">
                    Dikkatli değerlendirin
                  </span>
                )}
              </div>

              {/* Mini trend bar */}
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${
                      alert.trend === "increasing"
                        ? "bg-accent"
                        : alert.trend === "decreasing"
                          ? "bg-red-400"
                          : "bg-yellow-400"
                    }`}
                    style={{
                      width: `${Math.min(100, 50 + Math.abs(alert.changePercent))}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
