"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, MapPin, ExternalLink, Globe, Lock } from "lucide-react";
import LanguageBadge from "@/components/international/LanguageBadge";
import CurrencyConverter from "@/components/international/CurrencyConverter";
import { formatCurrency, convertToTRY } from "@/lib/international-client";

interface TenderData {
  id: string;
  title: string;
  titleTr: string | null;
  country: string;
  city: string | null;
  sector: string;
  estimatedBudget: string | null;
  currency: string;
  description: string;
  descriptionTr: string | null;
  applicationDeadline: string;
  sourceUrl: string;
  sourcePlatform: string;
  status: string;
}

export default function TenderDetailClient() {
  const params = useParams();
  const id = params.id as string;
  const [tender, setTender] = useState<TenderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [translating, setTranslating] = useState(false);
  const [translation, setTranslation] = useState<string | null>(null);
  const [translateError, setTranslateError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/international/tenders/${id}`);
        if (res.ok) setTender(await res.json());
      } catch { /* ignore */ } finally { setLoading(false); }
    }
    load();
  }, [id]);

  async function handleTranslate() {
    if (!tender) return;
    setTranslating(true);
    setTranslateError("");
    try {
      const res = await fetch("/api/international/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: tender.description }),
      });
      if (res.status === 403) {
        setTranslateError("Çeviri premium üyelik gerektirir.");
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setTranslation(data.translated);
      }
    } catch {
      setTranslateError("Çeviri yapılırken hata oluştu.");
    } finally {
      setTranslating(false);
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Yükleniyor...</div>;
  if (!tender) return <div className="min-h-screen flex items-center justify-center text-gray-500">İhale bulunamadı</div>;

  const budget = tender.estimatedBudget ? Number(tender.estimatedBudget) : 0;
  const tryBudget = budget ? convertToTRY(budget, tender.currency) : 0;
  const daysLeft = Math.max(0, Math.ceil((new Date(tender.applicationDeadline).getTime() - Date.now()) / 86400000));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <Link href="/uluslararasi/ihaleler" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft size={16} />
          İhale Listesi
        </Link>

        {/* Header Card */}
        <div className="bg-white rounded-xl border p-6 mb-6">
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <span className={`px-2 py-0.5 text-xs rounded font-medium ${
              tender.status === "CLOSING_SOON" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
            }`}>
              {tender.status === "CLOSING_SOON" ? "Son Gün Yaklaşıyor" : "Açık"}
            </span>
            <span className="px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-600">{tender.sourcePlatform}</span>
            <LanguageBadge hasTurkishSummary={!!tender.descriptionTr} />
          </div>

          <h1 className="text-xl font-bold text-gray-900 mb-1">
            {tender.titleTr || tender.title}
          </h1>
          {tender.titleTr && (
            <p className="text-sm text-gray-400 mb-3">{tender.title}</p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <MapPin size={14} />
              {tender.country}{tender.city && ` / ${tender.city}`}
            </span>
            <span className="flex items-center gap-1">
              <Calendar size={14} />
              <span className={daysLeft <= 14 ? "text-red-600 font-medium" : ""}>
                Son başvuru: {new Date(tender.applicationDeadline).toLocaleDateString("tr-TR")} ({daysLeft} gün)
              </span>
            </span>
          </div>

          {/* Budget */}
          {budget > 0 && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Tahmini Bütçe</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(budget, tender.currency)}</p>
              <p className="text-sm text-gray-400">≈ {tryBudget.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺</p>
            </div>
          )}

          <a
            href={tender.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-4 text-sm text-blue-600 hover:underline"
          >
            <Globe size={14} />
            Orijinal Kaynağa Git <ExternalLink size={12} />
          </a>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Turkish Description */}
            {tender.descriptionTr && (
              <div className="bg-white rounded-xl border p-6">
                <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  Türkçe Özet
                </h2>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {tender.descriptionTr}
                </p>
              </div>
            )}

            {/* Original Description */}
            <div className="bg-white rounded-xl border p-6">
              <h2 className="font-semibold text-gray-900 mb-3">Orijinal Açıklama</h2>
              <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                {tender.description}
              </p>

              {!tender.descriptionTr && !translation && (
                <div className="mt-4 pt-4 border-t">
                  {translateError && (
                    <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3 flex items-center gap-2">
                      <Lock size={14} /> {translateError}
                    </p>
                  )}
                  <button
                    onClick={handleTranslate}
                    disabled={translating}
                    className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {translating ? "Çevriliyor..." : "AI ile Türkçeye Çevir (Premium)"}
                  </button>
                </div>
              )}

              {translation && (
                <div className="mt-4 pt-4 border-t">
                  <h3 className="text-sm font-semibold text-green-700 mb-2">AI Çevirisi</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap bg-green-50 rounded-lg p-3">
                    {translation}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <CurrencyConverter defaultCurrency={tender.currency} defaultAmount={budget || 1000000} />

            <Link
              href={`/uluslararasi/ulkeler/${tender.country}`}
              className="block bg-white rounded-xl border p-4 hover:shadow-md transition-shadow"
            >
              <h4 className="text-sm font-semibold text-gray-700 mb-1">Ülke Profili</h4>
              <p className="text-xs text-gray-500">Risk analizi ve lojistik bilgileri görüntüle</p>
              <span className="text-xs text-blue-600 font-medium mt-2 inline-block">Profili Gör →</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
