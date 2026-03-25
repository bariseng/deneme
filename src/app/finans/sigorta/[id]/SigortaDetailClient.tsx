"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Shield,
  Award,
  Clock,
  TrendingDown,
  CheckCircle,
  Loader2,
  Banknote,
} from "lucide-react";

interface Provider {
  id: string;
  name: string;
  logoUrl: string | null;
}

interface CoverageDetails {
  type?: string;
  coverage?: string[];
  exclusions?: string[];
  maxPayment?: number;
}

interface Offer {
  id: string;
  providerId: string | null;
  providerName: string;
  premium: string;
  deductible: string;
  coverageDetails: CoverageDetails | null;
  processingDays: number;
  notes: string | null;
  expiresAt: string;
  isSelected: boolean;
  provider: Provider | null;
}

interface InsuranceDetail {
  id: string;
  type: string;
  coverageAmount: string;
  duration: number;
  description: string | null;
  status: string;
  createdAt: string;
  tender?: { id: string; title: string } | null;
  offers: Offer[];
}

const TYPE_LABELS: Record<string, string> = {
  MESLEKI: "Mesleki Sorumluluk Sigortası",
  ALL_RISK: "İnşaat All-Risk Sigortası",
  ISG: "İSG Sigortası",
};

function formatTRY(val: string | number) {
  return Number(val).toLocaleString("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 2 });
}

export default function SigortaDetailClient() {
  const params = useParams();
  const id = params.id as string;

  const [data, setData] = useState<InsuranceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/finance/insurance-request/${id}/offers`);
      if (res.ok) {
        const d = await res.json();
        setData(d);
        const selected = new Set<string>();
        d.offers?.forEach((o: Offer) => { if (o.isSelected) selected.add(o.id); });
        setAppliedIds(selected);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApply = async (offer: Offer) => {
    if (!offer.providerId || appliedIds.has(offer.id)) return;
    setApplyingId(offer.id);
    try {
      const res = await fetch("/api/finance/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partnerId: offer.providerId,
          offerType: "INSURANCE",
          offerId: offer.id,
          amount: Number(offer.premium),
        }),
      });
      if (res.ok) {
        setAppliedIds((prev) => new Set(prev).add(offer.id));
      }
    } catch {
      // ignore
    } finally {
      setApplyingId(null);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Yükleniyor...</div>;
  if (!data) return <div className="min-h-screen flex items-center justify-center text-gray-500">Talep bulunamadı</div>;

  const lowestPremium = data.offers.length > 0 ? Math.min(...data.offers.map((o) => Number(o.premium))) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/finans" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft size={16} />
          Finans Marketplace
        </Link>

        {/* Request Info */}
        <div className="bg-white rounded-xl border p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield size={24} className="text-purple-600" />
            <h1 className="text-2xl font-bold text-gray-900">{TYPE_LABELS[data.type]}</h1>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <span className="text-sm text-gray-500">Teminat Tutarı</span>
              <p className="text-lg font-bold text-gray-900">{formatTRY(data.coverageAmount)}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Süre</span>
              <p className="text-lg font-bold text-gray-900">{data.duration} ay</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Teklif Sayısı</span>
              <p className="text-lg font-bold text-gray-900">{data.offers.length}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Tarih</span>
              <p className="text-lg font-bold text-gray-900">{new Date(data.createdAt).toLocaleDateString("tr-TR")}</p>
            </div>
          </div>
        </div>

        {/* Comparison */}
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Teklifleri Karşılaştır ({data.offers.length} sigorta şirketi)
        </h2>

        {data.offers.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center">
            <Shield size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Henüz teklif gelmedi.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block bg-white rounded-xl border overflow-hidden mb-6">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Sigorta Şirketi</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Prim</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Muafiyet</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Süre</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Kapsam</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Geçerlilik</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.offers.map((offer) => {
                    const isBest = Number(offer.premium) === lowestPremium;
                    const isApplied = appliedIds.has(offer.id);
                    const coverage = offer.coverageDetails as CoverageDetails | null;

                    return (
                      <tr key={offer.id} className={`${isBest ? "bg-purple-50" : ""} hover:bg-gray-50`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-700">
                              {offer.providerName.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{offer.providerName}</p>
                              {isBest && (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full mt-0.5">
                                  <Award size={10} />
                                  En Uygun
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`text-sm font-bold ${isBest ? "text-purple-700" : "text-gray-900"}`}>
                            {formatTRY(offer.premium)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center text-sm text-gray-700">
                          {formatTRY(offer.deductible)}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="flex items-center justify-center gap-1 text-sm">
                            <Clock size={14} className="text-gray-400" />
                            {offer.processingDays} gün
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          {coverage?.coverage && (
                            <ul className="text-xs text-gray-600 space-y-0.5">
                              {coverage.coverage.slice(0, 3).map((c, i) => (
                                <li key={i} className="flex items-center gap-1">
                                  <CheckCircle size={10} className="text-green-500 shrink-0" />
                                  {c}
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center text-xs text-gray-500">
                          {new Date(offer.expiresAt).toLocaleDateString("tr-TR")}
                        </td>
                        <td className="px-4 py-4 text-center">
                          {isApplied ? (
                            <span className="inline-flex items-center gap-1 text-sm text-purple-600 font-medium">
                              <CheckCircle size={16} />
                              Başvuruldu
                            </span>
                          ) : (
                            <button
                              onClick={() => handleApply(offer)}
                              disabled={applyingId === offer.id}
                              className={`inline-flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                isBest
                                  ? "bg-purple-600 text-white hover:bg-purple-700"
                                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                              } disabled:opacity-50`}
                            >
                              {applyingId === offer.id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Banknote size={14} />
                              )}
                              Başvur
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3 mb-6">
              {data.offers.map((offer) => {
                const isBest = Number(offer.premium) === lowestPremium;
                const isApplied = appliedIds.has(offer.id);
                const coverage = offer.coverageDetails as CoverageDetails | null;

                return (
                  <div key={offer.id} className={`bg-white rounded-xl border p-5 ${isBest ? "border-purple-300 bg-purple-50" : ""}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-700">
                          {offer.providerName.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-semibold text-gray-900">{offer.providerName}</span>
                      </div>
                      {isBest && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                          <Award size={10} /> En Uygun
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                      <div>
                        <span className="text-gray-500">Prim</span>
                        <p className={`font-bold ${isBest ? "text-purple-700" : ""}`}>{formatTRY(offer.premium)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Muafiyet</span>
                        <p className="font-medium">{formatTRY(offer.deductible)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Süre</span>
                        <p className="font-medium">{offer.processingDays} gün</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Geçerlilik</span>
                        <p className="font-medium">{new Date(offer.expiresAt).toLocaleDateString("tr-TR")}</p>
                      </div>
                    </div>
                    {coverage?.coverage && (
                      <div className="mb-3">
                        <p className="text-xs text-gray-500 mb-1">Kapsam:</p>
                        <div className="flex flex-wrap gap-1">
                          {coverage.coverage.map((c, i) => (
                            <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{c}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {isApplied ? (
                      <div className="text-center text-purple-600 font-medium flex items-center justify-center gap-1">
                        <CheckCircle size={16} /> Başvuruldu
                      </div>
                    ) : (
                      <button
                        onClick={() => handleApply(offer)}
                        disabled={applyingId === offer.id}
                        className={`w-full py-2.5 rounded-lg text-sm font-medium ${
                          isBest ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-700"
                        } disabled:opacity-50`}
                      >
                        {applyingId === offer.id ? "İşleniyor..." : "Başvur"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200 p-5">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown size={18} className="text-purple-600" />
                <span className="font-semibold text-purple-800">En Uygun Teklif Özeti</span>
              </div>
              <p className="text-sm text-purple-700">
                {data.offers.length} şirket arasında en düşük prim: <strong>{formatTRY(lowestPremium)}</strong>
                {" "}({data.offers[0]?.providerName})
                {" | "}Teminat: {formatTRY(data.coverageAmount)}
                {" | "}Prim oranı: %{((lowestPremium / Number(data.coverageAmount)) * 100).toFixed(3)}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
