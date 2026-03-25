"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Target,
  Brain,
  FileText,
  BarChart3,
  Zap,
  RefreshCw,
  Bell,
  Building2,
  TrendingUp,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  Settings,
  Play,
} from "lucide-react";

interface AgentResult {
  id: string;
  matchScore: number | null;
  isRead: boolean;
  createdAt: string;
  analysis: {
    reasons?: string[];
    competitorInsight?: string;
  };
  tender: {
    id: string;
    title: string;
    city: string;
    tenderType: string;
    deadline: string;
    estimatedCost: string | null;
    institution: string;
  } | null;
  task: {
    type: string;
    status: string;
  };
}

interface FirmProfile {
  id: string;
  companyName: string;
  sectors: string[];
  cities: string[];
  maxBudget: string;
  preferredTypes: string[];
  experienceYears: number;
  keywords: string[];
}

interface MatchResponse {
  matches: {
    tenderId: string;
    tenderTitle: string;
    matchScore: number;
    reasons: string[];
    competitorInsight?: string;
    deadline: string;
    estimatedCost: string | null;
    city: string;
  }[];
  totalScanned: number;
  matchedCount: number;
}

export default function AgentDashboardClient() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<FirmProfile | null>(null);
  const [results, setResults] = useState<AgentResult[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [matchData, setMatchData] = useState<MatchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [activeTab, setActiveTab] = useState<"results" | "profile" | "briefing">("results");

  // Profile form state
  const [formCompany, setFormCompany] = useState("");
  const [formSectors, setFormSectors] = useState("");
  const [formCities, setFormCities] = useState("");
  const [formMaxBudget, setFormMaxBudget] = useState("");
  const [formTypes, setFormTypes] = useState("");
  const [formExperience, setFormExperience] = useState("");
  const [formKeywords, setFormKeywords] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [profileRes, resultsRes] = await Promise.all([
        fetch("/api/agent/profile"),
        fetch("/api/agent/results?limit=10"),
      ]);

      const profileData = await profileRes.json();
      const resultsData = await resultsRes.json();

      if (profileData.success && profileData.data) {
        const p = profileData.data;
        setProfile(p);
        setFormCompany(p.companyName);
        setFormSectors(p.sectors.join(", "));
        setFormCities(p.cities.join(", "));
        setFormMaxBudget(String(Number(p.maxBudget) / 1_000_000));
        setFormTypes(p.preferredTypes.join(", "));
        setFormExperience(String(p.experienceYears));
        setFormKeywords(p.keywords.join(", "));
      }
      if (resultsData.success) {
        setResults(resultsData.data);
        setUnreadCount(resultsData.unreadCount);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user) fetchData();
    else setLoading(false);
  }, [session, fetchData]);

  const handleScan = async () => {
    setScanning(true);
    try {
      const res = await fetch("/api/agent/match", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setMatchData(data.data);
        fetchData(); // refresh results
      }
    } catch {
      // silent
    } finally {
      setScanning(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/agent/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: formCompany,
          sectors: formSectors.split(",").map((s) => s.trim()).filter(Boolean),
          cities: formCities.split(",").map((s) => s.trim()).filter(Boolean),
          maxBudget: parseFloat(formMaxBudget) * 1_000_000 || 0,
          preferredTypes: formTypes.split(",").map((s) => s.trim()).filter(Boolean),
          experienceYears: parseInt(formExperience) || 0,
          keywords: formKeywords.split(",").map((s) => s.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setProfile(data.data);
        setActiveTab("results");
      }
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const formatCost = (cost: string | null) => {
    if (!cost) return "—";
    const num = Number(cost);
    return num >= 1_000_000
      ? `${(num / 1_000_000).toFixed(1)}M ₺`
      : `${(num / 1_000).toFixed(0)}K ₺`;
  };

  if (!session?.user) {
    return (
      <div className="bg-background-alt min-h-screen">
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <Target size={48} className="mx-auto text-primary mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">İhale Avcısı — Agentic AI</h1>
          <p className="text-foreground-light mb-6">
            Otonom ihale eşleştirme için giriş yapmanız gerekiyor.
          </p>
          <Link
            href="/giris"
            className="inline-block bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-dark transition-colors"
          >
            Giriş Yap
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background-alt min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-background-dark to-primary py-8 md:py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                <Target size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">İhale Avcısı</h1>
                <p className="text-blue-200 text-sm mt-0.5">Agentic AI — Otonom İhale İstihbaratı</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <span className="flex items-center gap-1 px-3 py-1.5 bg-secondary/20 text-secondary rounded-full text-xs font-semibold">
                  <Bell size={12} />
                  {unreadCount} yeni
                </span>
              )}
              <button
                onClick={handleScan}
                disabled={scanning || !profile}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {scanning ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                Taramayı Başlat
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats row */}
        {matchData && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-border p-4 text-center">
              <p className="text-2xl font-bold text-primary">{matchData.totalScanned}</p>
              <p className="text-xs text-foreground-light mt-1">İhale Tarandı</p>
            </div>
            <div className="bg-white rounded-xl border border-border p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">{matchData.matchedCount}</p>
              <p className="text-xs text-foreground-light mt-1">Uyumlu Bulundu</p>
            </div>
            <div className="bg-white rounded-xl border border-border p-4 text-center">
              <p className="text-2xl font-bold text-purple-600">
                %{matchData.matches[0]?.matchScore || 0}
              </p>
              <p className="text-xs text-foreground-light mt-1">En Yüksek Uyum</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl border border-border p-1 mb-6">
          {[
            { id: "results" as const, label: "Eşleştirme Sonuçları", icon: TrendingUp },
            { id: "profile" as const, label: "Firma Profili", icon: Building2 },
            { id: "briefing" as const, label: "AI Brifing", icon: BarChart3 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-primary text-white"
                  : "text-foreground-light hover:text-foreground hover:bg-gray-50"
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Results tab */}
            {activeTab === "results" && (
              <div className="space-y-4">
                {!profile && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                    <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">Firma Profili Gerekli</p>
                      <p className="text-xs text-amber-700 mt-1">
                        İhale eşleştirme için önce firma profilinizi oluşturun.
                      </p>
                      <button
                        onClick={() => setActiveTab("profile")}
                        className="mt-2 text-xs font-medium text-amber-700 hover:text-amber-900 flex items-center gap-1"
                      >
                        <Settings size={12} />
                        Profil Oluştur
                      </button>
                    </div>
                  </div>
                )}

                {/* Live match results */}
                {matchData?.matches && matchData.matches.length > 0 && (
                  <div className="bg-white rounded-xl border border-border overflow-hidden">
                    <div className="px-5 py-3 border-b border-border flex items-center gap-2">
                      <Zap size={16} className="text-primary" />
                      <h2 className="text-sm font-bold text-foreground">Son Tarama Sonuçları</h2>
                    </div>
                    <div className="divide-y divide-border">
                      {matchData.matches.slice(0, 10).map((match) => (
                        <Link
                          key={match.tenderId}
                          href={`/ihaleler/${match.tenderId}`}
                          className="block px-5 py-3 hover:bg-blue-50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground truncate">
                                {match.tenderTitle}
                              </p>
                              <div className="flex items-center gap-2 mt-1 text-xs text-foreground-light">
                                <span>{match.city}</span>
                                <span>•</span>
                                <span>{formatCost(match.estimatedCost)}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Calendar size={10} />
                                  {new Date(match.deadline).toLocaleDateString("tr-TR")}
                                </span>
                              </div>
                              {match.reasons.length > 0 && (
                                <p className="text-xs text-foreground-light mt-1 truncate">
                                  {match.reasons[0]}
                                </p>
                              )}
                              {match.competitorInsight && (
                                <p className="text-xs text-amber-600 mt-0.5">{match.competitorInsight}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={`text-sm font-bold ${
                                  match.matchScore >= 80
                                    ? "text-emerald-600"
                                    : match.matchScore >= 60
                                      ? "text-primary"
                                      : "text-amber-600"
                                }`}
                              >
                                %{match.matchScore}
                              </span>
                              <ChevronRight size={14} className="text-foreground-light" />
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Historical results */}
                {results.length > 0 && (
                  <div className="bg-white rounded-xl border border-border overflow-hidden">
                    <div className="px-5 py-3 border-b border-border flex items-center gap-2">
                      <RefreshCw size={16} className="text-foreground-light" />
                      <h2 className="text-sm font-bold text-foreground">Geçmiş Sonuçlar</h2>
                    </div>
                    <div className="divide-y divide-border">
                      {results.map((result) => (
                        <div key={result.id} className="px-5 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                {!result.isRead && (
                                  <span className="w-2 h-2 bg-primary rounded-full shrink-0" />
                                )}
                                <p className="text-sm font-medium text-foreground truncate">
                                  {result.tender?.title || "Bilinmeyen ihale"}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-xs text-foreground-light">
                                <span className="capitalize">{result.task.type.replace("_", " ").toLowerCase()}</span>
                                <span>•</span>
                                <span>{new Date(result.createdAt).toLocaleDateString("tr-TR")}</span>
                              </div>
                            </div>
                            {result.matchScore && (
                              <span
                                className={`text-sm font-bold ${
                                  result.matchScore >= 80
                                    ? "text-emerald-600"
                                    : result.matchScore >= 60
                                      ? "text-primary"
                                      : "text-amber-600"
                                }`}
                              >
                                %{Math.round(result.matchScore)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!matchData && results.length === 0 && profile && (
                  <div className="text-center py-12">
                    <Target size={40} className="mx-auto text-foreground-light mb-3" />
                    <p className="text-foreground font-medium">Henüz sonuç yok</p>
                    <p className="text-sm text-foreground-light mt-1">
                      &quot;Taramayı Başlat&quot; butonuna tıklayarak ilk eşleştirmeyi yapın.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Profile tab */}
            {activeTab === "profile" && (
              <div className="bg-white rounded-xl border border-border p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Building2 size={20} className="text-primary" />
                  <h2 className="text-lg font-bold text-foreground">Firma Profili</h2>
                  {profile && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">
                      <CheckCircle2 size={10} />
                      Aktif
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-foreground-light mb-1">
                      Firma Adı
                    </label>
                    <input
                      type="text"
                      value={formCompany}
                      onChange={(e) => setFormCompany(e.target.value)}
                      className="w-full h-10 px-3 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Firma adınız"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground-light mb-1">
                      Deneyim (Yıl)
                    </label>
                    <input
                      type="number"
                      value={formExperience}
                      onChange={(e) => setFormExperience(e.target.value)}
                      className="w-full h-10 px-3 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="5"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground-light mb-1">
                      Sektörler (virgülle ayırın)
                    </label>
                    <input
                      type="text"
                      value={formSectors}
                      onChange={(e) => setFormSectors(e.target.value)}
                      className="w-full h-10 px-3 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Yapım İşleri, Bilişim"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground-light mb-1">
                      Şehirler (virgülle ayırın)
                    </label>
                    <input
                      type="text"
                      value={formCities}
                      onChange={(e) => setFormCities(e.target.value)}
                      className="w-full h-10 px-3 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="İstanbul, Ankara, İzmir"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground-light mb-1">
                      Maks. Bütçe (Milyon ₺)
                    </label>
                    <input
                      type="number"
                      value={formMaxBudget}
                      onChange={(e) => setFormMaxBudget(e.target.value)}
                      className="w-full h-10 px-3 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground-light mb-1">
                      İhale Türleri (virgülle)
                    </label>
                    <input
                      type="text"
                      value={formTypes}
                      onChange={(e) => setFormTypes(e.target.value)}
                      className="w-full h-10 px-3 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="YAPIM, HIZMET"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-foreground-light mb-1">
                      Anahtar Kelimeler (virgülle ayırın)
                    </label>
                    <input
                      type="text"
                      value={formKeywords}
                      onChange={(e) => setFormKeywords(e.target.value)}
                      className="w-full h-10 px-3 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="altyapı, beton, yazılım, ağ"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving || !formCompany}
                    className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
                  >
                    {saving && <Loader2 size={14} className="animate-spin" />}
                    Profili Kaydet
                  </button>
                </div>
              </div>
            )}

            {/* Briefing tab */}
            {activeTab === "briefing" && (
              <BriefingTab profile={profile} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function BriefingTab({ profile }: { profile: FirmProfile | null }) {
  const [briefingText, setBriefingText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateBriefing = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/agent/briefing", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setBriefingText(data.data.summaryText);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  if (!profile) {
    return (
      <div className="bg-white rounded-xl border border-border p-8 text-center">
        <BarChart3 size={40} className="mx-auto text-foreground-light mb-3" />
        <p className="text-foreground font-medium">Brifing için firma profili gerekli</p>
        <p className="text-sm text-foreground-light mt-1">
          Önce &quot;Firma Profili&quot; sekmesinden profilinizi oluşturun.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!briefingText && (
        <div className="bg-white rounded-xl border border-border p-8 text-center">
          <Brain size={40} className="mx-auto text-primary mb-3" />
          <p className="text-foreground font-medium mb-2">Haftalık AI Brifing</p>
          <p className="text-sm text-foreground-light mb-4">
            Firma profilinize göre kişiselleştirilmiş ihale istihbaratı raporu.
          </p>
          <button
            onClick={generateBriefing}
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
            Brifing Oluştur
          </button>
        </div>
      )}

      {briefingText && (
        <div className="bg-white rounded-xl border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={18} className="text-primary" />
            <h2 className="text-lg font-bold text-foreground">AI Brifing Raporu</h2>
          </div>
          <div className="prose prose-sm max-w-none text-foreground text-sm leading-relaxed">
            {briefingText.split("\n").map((line, i) => (
              <span key={i}>
                {line.split(/(\*\*[^*]+\*\*)/).map((part, j) => {
                  if (part.startsWith("**") && part.endsWith("**")) {
                    return <strong key={j}>{part.slice(2, -2)}</strong>;
                  }
                  return <span key={j}>{part}</span>;
                })}
                {i < briefingText.split("\n").length - 1 && <br />}
              </span>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-border flex justify-end">
            <button
              onClick={generateBriefing}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-sm text-primary hover:bg-blue-50 rounded-lg transition-colors"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Yenile
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
