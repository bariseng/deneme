"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Landmark,
  Award,
  Clock,
  TrendingDown,
  CheckCircle,
  Loader2,
  Building2,
  Percent,
  Banknote,
  Calendar,
} from "lucide-react";

interface Provider {
  id: string;
  name: string;
  logoUrl: string | null;
  type: string;
}

interface Offer {
  id: string;
  providerId: string | null;
  providerName: string;
  interestRate: number;
  commission: string;
  processingDays: number;
  totalCost: string;
  notes: string | null;
  expiresAt: string;
  isSelected: boolean;
  provider: Provider | null;
}

interface GuaranteeDetail {
  id: string;
  type: string;
  amount: string;
  duration: number;
  description: string | null;
  status: string;
  createdAt: string;
  tender?: { id: string; title: string; estimatedCost: string } | null;
  offers: Offer[];
}

const TYPE_LABELS: Record<string, string> = {
  GECICI: "Geçici Teminat Mektubu",
  KESIN: "Kesin Teminat Mektubu",
  AVANS: "Avans Teminat Mektubu",
};

function formatTRY(val: string | number) {
  return Number(val).toLocaleString("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 2 });
}

export default function TeminatDetailClient() {
  const params = useParams();
  const id = params.id as string;

  const [data, setData] = useState<GuaranteeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/finance/guarantee-request/${id}/offers`);
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
          offerType: "GUARANTEE",
          offerId: offer.id,
          amount: Number(offer.totalCost),
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

  const lowestCost = data.offers.length > 0 ? Math.min(...data.offers.map((o) => Number(o.totalCost))) : 0;

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
            <Landmark size={24} className="text-emerald-600" />
            <h1 className="text-2xl font-bold text-gray-900">{TYPE_LABELS[data.type]}</h1>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <span className="text-sm text-gray-500">Tutar</span>
              <p className="text-lg font-bold text-gray-900">{formatTRY(data.amount)}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Süre</span>
              <p className="text-lg font-bold text-gray-900">{data.duration} gün</p>
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
          {data.tender && (
            <div className="mt-3 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg inline-block">
              İhale: {data.tender.title}
            </div>
          )}
        </div>

        {/* Comparison Table */}
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Teklifleri Karşılaştır ({data.offers.length} banka)
        </h2>

        {data.offers.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center">
            <Landmark size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Henüz teklif gelmedi. Teklifler kısa sürede oluşturulacak.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block bg-white rounded-xl border overflow-hidden mb-6">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Banka</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Faiz Oranı</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Komisyon</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Toplam Maliyet</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Süre</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Geçerlilik</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.offers.map((offer, idx) => {
                    const isBest = Number(offer.totalCost) === lowestCost;
                    const isApplied = appliedIds.has(offer.id);

                    return (
                      <tr key={offer.id} className={`${isBest ? "bg-emerald-50" : ""} hover:bg-gray-50`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                              {offer.providerName.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{offer.providerName}</p>
                              {isBest && (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full mt-0.5">
                                  <Award size={10} />
                                  En Uygun
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="flex items-center justify-center gap-1 text-sm font-medium">
                            <Percent size={14} className="text-gray-400" />
                            {offer.interestRate.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center text-sm font-medium text-gray-900">
                          {formatTRY(offer.commission)}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`text-sm font-bold ${isBest ? "text-emerald-700" : "text-gray-900"}`}>
                            {formatTRY(offer.totalCost)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="flex items-center justify-center gap-1 text-sm">
                            <Clock size={14} className="text-gray-400" />
                            {offer.processingDays} gün
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center text-xs text-gray-500">
                          {new Date(offer.expiresAt).toLocaleDateString("tr-TR")}
                        </td>
                        <td className="px-4 py-4 text-center">
                          {isApplied ? (
                            <span className="inline-flex items-center gap-1 text-sm text-emerald-600 font-medium">
                              <CheckCircle size={16} />
                              Başvuruldu
                            </span>
                          ) : (
                            <button
                              onClick={() => handleApply(offer)}
                              disabled={applyingId === offer.id}
                              className={`inline-flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                isBest
                                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
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
                const isBest = Number(offer.totalCost) === lowestCost;
                const isApplied = appliedIds.has(offer.id);

                return (
                  <div key={offer.id} className={`bg-white rounded-xl border p-5 ${isBest ? "border-emerald-300 bg-emerald-50" : ""}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-xs font-bold">
                          {offer.providerName.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-semibold text-gray-900">{offer.providerName}</span>
                      </div>
                      {isBest && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          <Award size={10} />
                          En Uygun
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                      <div>
                        <span className="text-gray-500">Faiz</span>
                        <p className="font-medium">%{offer.interestRate.toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Toplam Maliyet</span>
                        <p className={`font-bold ${isBest ? "text-emerald-700" : ""}`}>{formatTRY(offer.totalCost)}</p>
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
                    {isApplied ? (
                      <div className="text-center text-emerald-600 font-medium flex items-center justify-center gap-1">
                        <CheckCircle size={16} /> Başvuruldu
                      </div>
                    ) : (
                      <button
                        onClick={() => handleApply(offer)}
                        disabled={applyingId === offer.id}
                        className={`w-full py-2.5 rounded-lg text-sm font-medium ${
                          isBest ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-700"
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
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-200 p-5">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown size={18} className="text-emerald-600" />
                <span className="font-semibold text-emerald-800">En Uygun Teklif Özeti</span>
              </div>
              <p className="text-sm text-emerald-700">
                {data.offers.length} banka arasında en düşük maliyet: <strong>{formatTRY(lowestCost)}</strong>
                {" "}({data.offers[0]?.providerName})
                {" | "}Teminat tutarı: {formatTRY(data.amount)}
                {" | "}Maliyet oranı: %{((lowestCost / Number(data.amount)) * 100).toFixed(3)}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
