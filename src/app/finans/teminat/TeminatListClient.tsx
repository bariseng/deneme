"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Landmark, Plus, Clock, ArrowLeft, ChevronRight } from "lucide-react";

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

const TYPE_LABELS: Record<string, string> = {
  GECICI: "Geçici Teminat",
  KESIN: "Kesin Teminat",
  AVANS: "Avans Teminat",
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

export default function TeminatListClient() {
  const [items, setItems] = useState<GuaranteeReq[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/finance/guarantee-request");
      if (res.ok) {
        setItems(await res.json());
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Yükleniyor...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/finans" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft size={16} />
          Finans Marketplace
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Landmark size={24} className="text-emerald-600" />
            <h1 className="text-2xl font-bold text-gray-900">Teminat Mektubu Talepleri</h1>
          </div>
          <Link
            href="/finans/teminat/yeni"
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
          >
            <Plus size={16} />
            Yeni Talep
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center">
            <Landmark size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-4">Henüz teminat mektubu talebi oluşturmadınız.</p>
            <Link
              href="/finans/teminat/yeni"
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
            >
              <Plus size={16} />
              İlk Talebi Oluştur
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const status = STATUS_MAP[item.status] || { label: item.status, color: "bg-gray-100 text-gray-800" };
              return (
                <Link key={item.id} href={`/finans/teminat/${item.id}`} className="block">
                  <div className="bg-white rounded-xl border p-5 hover:border-emerald-300 hover:shadow-sm transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900">
                            {TYPE_LABELS[item.type] || item.type}
                          </h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>Tutar: {formatTRY(item.amount)}</span>
                          <span className="flex items-center gap-1">
                            <Clock size={14} />
                            {item.duration} gün
                          </span>
                          <span>{item._count.offers} teklif</span>
                          <span>{new Date(item.createdAt).toLocaleDateString("tr-TR")}</span>
                        </div>
                        {item.tender && (
                          <p className="text-xs text-blue-600 mt-1">İhale: {item.tender.title}</p>
                        )}
                      </div>
                      <ChevronRight size={20} className="text-gray-400" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
