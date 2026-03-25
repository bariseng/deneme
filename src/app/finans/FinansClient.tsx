"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Landmark,
  Shield,
  Plus,
  TrendingUp,
  Clock,
  FileText,
  ArrowRight,
  Building2,
  Banknote,
  ChevronRight,
} from "lucide-react";

interface GuaranteeReq {
  id: string;
  type: string;
  amount: string;
  duration: number;
  status: string;
  createdAt: string;
  tender?: { id: string; title: string } | null;
  _count: { offers: number };
}

interface InsuranceReq {
  id: string;
  type: string;
  coverageAmount: string;
  duration: number;
  status: string;
  createdAt: string;
  tender?: { id: string; title: string } | null;
  _count: { offers: number };
}

interface Stats {
  guaranteeCount: number;
  insuranceCount: number;
  guaranteePending: number;
  insurancePending: number;
  leadCount: number;
  totalRequests: number;
}

const TYPE_LABELS: Record<string, string> = {
  GECICI: "Geçici Teminat",
  KESIN: "Kesin Teminat",
  AVANS: "Avans Teminat",
  MESLEKI: "Mesleki Sorumluluk",
  ALL_RISK: "İnşaat All-Risk",
  ISG: "İSG Sigortası",
};

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  BEKLEMEDE: { label: "Beklemede", color: "bg-yellow-100 text-yellow-800" },
  TEKLIFLER_ALINDI: { label: "Teklifler Geldi", color: "bg-blue-100 text-blue-800" },
  ONAYLANDI: { label: "Onaylandı", color: "bg-green-100 text-green-800" },
  REDDEDILDI: { label: "Reddedildi", color: "bg-red-100 text-red-800" },
  IPTAL: { label: "İptal", color: "bg-gray-100 text-gray-800" },
};

function formatTRY(val: string | number) {
  return Number(val).toLocaleString("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 2 });
}

export default function FinansClient() {
  const [tab, setTab] = useState<"teminat" | "sigorta">("teminat");
  const [guarantees, setGuarantees] = useState<GuaranteeReq[]>([]);
  const [insurances, setInsurances] = useState<InsuranceReq[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [gRes, iRes, sRes] = await Promise.all([
        fetch("/api/finance/guarantee-request"),
        fetch("/api/finance/insurance-request"),
        fetch("/api/finance/partners?action=stats"),
      ]);
      if (gRes.ok) setGuarantees(await gRes.json());
      if (iRes.ok) setInsurances(await iRes.json());
      if (sRes.ok) setStats(await sRes.json());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Banknote className="text-emerald-600" size={32} />
              Finans Marketplace
            </h1>
            <p className="text-gray-500 mt-1">
              Teminat mektubu ve sigorta tekliflerini karşılaştırın, en uygun teklifi seçin
            </p>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Toplam Talep", value: stats.totalRequests, icon: FileText, color: "text-blue-600" },
              { label: "Teminat Talebi", value: stats.guaranteeCount, icon: Landmark, color: "text-emerald-600" },
              { label: "Sigorta Talebi", value: stats.insuranceCount, icon: Shield, color: "text-purple-600" },
              { label: "Başvuru Sayısı", value: stats.leadCount, icon: TrendingUp, color: "text-orange-600" },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <s.icon size={18} className={s.color} />
                  <span className="text-sm text-gray-500">{s.label}</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
          <button
            onClick={() => setTab("teminat")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              tab === "teminat" ? "bg-white text-emerald-700 shadow-sm" : "text-gray-600 hover:text-gray-800"
            }`}
          >
            <Landmark size={16} />
            Teminat Mektubu
          </button>
          <button
            onClick={() => setTab("sigorta")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              tab === "sigorta" ? "bg-white text-purple-700 shadow-sm" : "text-gray-600 hover:text-gray-800"
            }`}
          >
            <Shield size={16} />
            Sigorta
          </button>
        </div>

        {/* Content */}
        {tab === "teminat" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Teminat Mektubu Taleplerim</h2>
              <Link
                href="/finans/teminat/yeni"
                className="inline-flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-700"
              >
                <Plus size={16} />
                Yeni Teminat Talebi
              </Link>
            </div>

            {loading ? (
              <div className="text-center py-16 text-gray-500">Yükleniyor...</div>
            ) : guarantees.length === 0 ? (
              <div className="bg-white rounded-xl border p-12 text-center">
                <Landmark size={48} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-600">Henüz teminat talebi yok</h3>
                <p className="text-gray-400 mt-1 mb-4">Tek formla birden fazla bankadan teklif alın</p>
                <Link
                  href="/finans/teminat/yeni"
                  className="inline-flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-emerald-700"
                >
                  <Plus size={18} />
                  Teminat Talebi Oluştur
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {guarantees.map((g) => {
                  const statusInfo = STATUS_MAP[g.status] || STATUS_MAP.BEKLEMEDE;
                  return (
                    <Link
                      key={g.id}
                      href={`/finans/teminat/${g.id}`}
                      className="block bg-white rounded-xl border hover:border-emerald-300 hover:shadow-md transition-all p-5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded text-xs font-medium">
                              {TYPE_LABELS[g.type]}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                          </div>
                          <p className="text-lg font-semibold text-gray-900">{formatTRY(g.amount)}</p>
                          <div className="flex gap-4 text-sm text-gray-500 mt-1">
                            <span className="flex items-center gap-1">
                              <Clock size={14} />
                              {g.duration} gün
                            </span>
                            <span className="flex items-center gap-1">
                              <Building2 size={14} />
                              {g._count.offers} teklif
                            </span>
                            {g.tender && (
                              <span className="text-blue-600">İhale: {g.tender.title}</span>
                            )}
                          </div>
                        </div>
                        <ChevronRight size={20} className="text-gray-400" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === "sigorta" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Sigorta Taleplerim</h2>
              <Link
                href="/finans/sigorta/yeni"
                className="inline-flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-purple-700"
              >
                <Plus size={16} />
                Yeni Sigorta Talebi
              </Link>
            </div>

            {loading ? (
              <div className="text-center py-16 text-gray-500">Yükleniyor...</div>
            ) : insurances.length === 0 ? (
              <div className="bg-white rounded-xl border p-12 text-center">
                <Shield size={48} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-600">Henüz sigorta talebi yok</h3>
                <p className="text-gray-400 mt-1 mb-4">Farklı sigorta şirketlerinden teklif alın</p>
                <Link
                  href="/finans/sigorta/yeni"
                  className="inline-flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700"
                >
                  <Plus size={18} />
                  Sigorta Talebi Oluştur
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {insurances.map((i) => {
                  const statusInfo = STATUS_MAP[i.status] || STATUS_MAP.BEKLEMEDE;
                  return (
                    <Link
                      key={i.id}
                      href={`/finans/sigorta/${i.id}`}
                      className="block bg-white rounded-xl border hover:border-purple-300 hover:shadow-md transition-all p-5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded text-xs font-medium">
                              {TYPE_LABELS[i.type]}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                          </div>
                          <p className="text-lg font-semibold text-gray-900">{formatTRY(i.coverageAmount)}</p>
                          <div className="flex gap-4 text-sm text-gray-500 mt-1">
                            <span className="flex items-center gap-1">
                              <Clock size={14} />
                              {i.duration} ay
                            </span>
                            <span className="flex items-center gap-1">
                              <Building2 size={14} />
                              {i._count.offers} teklif
                            </span>
                            {i.tender && (
                              <span className="text-blue-600">İhale: {i.tender.title}</span>
                            )}
                          </div>
                        </div>
                        <ChevronRight size={20} className="text-gray-400" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Partner Bilgi Bölümü */}
        <div className="mt-10 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Nasıl Çalışır?</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { step: "1", title: "Talep Oluşturun", desc: "Teminat mektubu veya sigorta ihtiyacınızı tek formla belirtin" },
              { step: "2", title: "Teklifleri Karşılaştırın", desc: "Birden fazla banka/sigorta şirketinden otomatik teklifler alın" },
              { step: "3", title: "En Uygun Teklifi Seçin", desc: "Faiz, komisyon ve süreyi karşılaştırarak başvurunuzu yapın" },
            ].map((s) => (
              <div key={s.step} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
                  {s.step}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{s.title}</h4>
                  <p className="text-sm text-gray-600 mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
