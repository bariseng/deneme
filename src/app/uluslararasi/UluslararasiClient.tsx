"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Globe, ArrowRight, Calendar, MapPin } from "lucide-react";
import CountryCard from "@/components/international/CountryCard";
import CurrencyConverter from "@/components/international/CurrencyConverter";
import { formatBudget } from "@/lib/international-client";

interface Country {
  id: string;
  countryCode: string;
  name: string;
  nameTr: string;
  riskScore: number;
  activeProjectCount: number;
  flagUrl: string | null;
}

interface Tender {
  id: string;
  title: string;
  titleTr: string | null;
  country: string;
  city: string | null;
  sector: string;
  estimatedBudget: string | null;
  currency: string;
  applicationDeadline: string;
  status: string;
}

export default function UluslararasiClient() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [cRes, tRes] = await Promise.all([
          fetch("/api/international/countries"),
          fetch("/api/international/tenders?limit=6"),
        ]);

        if (cRes.ok) setCountries(await cRes.json());
        if (tRes.ok) {
          const data = await tRes.json();
          if (data.items && data.items.length === 0) {
            await fetch("/api/international/tenders?action=seed");
            const retry = await fetch("/api/international/tenders?limit=6");
            if (retry.ok) {
              const retryData = await retry.json();
              setTenders(retryData.items || []);
            }
          } else {
            setTenders(data.items || []);
          }
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Yükleniyor...</div>;

  const daysLeft = (deadline: string) => Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Globe size={24} className="text-blue-600" />
              Uluslararası İhale Portali
            </h1>
            <p className="text-gray-500 text-sm mt-1">Yurtdışı ihaleleri Türkçe özetlerle takip edin</p>
          </div>
          <Link
            href="/uluslararasi/ihaleler"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Tüm İhaleleri Gör
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* Country Grid */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Ülke Profilleri</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {countries.map((c) => (
              <CountryCard
                key={c.id}
                countryCode={c.countryCode}
                name={c.name}
                nameTr={c.nameTr}
                riskScore={c.riskScore}
                activeProjectCount={c.activeProjectCount}
                flagUrl={c.flagUrl}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Tenders */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Son İhaleler</h2>
              <Link href="/uluslararasi/ihaleler" className="text-sm text-blue-600 hover:underline">
                Tümünü gör
              </Link>
            </div>
            <div className="space-y-3">
              {tenders.map((t) => (
                <Link key={t.id} href={`/uluslararasi/ihaleler/${t.id}`} className="block">
                  <div className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 text-sm truncate">
                          {t.titleTr || t.title}
                        </h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <MapPin size={10} />
                            {t.country} {t.city && `/ ${t.city}`}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar size={10} />
                            {daysLeft(t.applicationDeadline)} gün kaldı
                          </span>
                        </div>
                      </div>
                      {t.estimatedBudget && (
                        <span className="text-sm font-bold text-gray-900 whitespace-nowrap">
                          {t.currency} {formatBudget(Number(t.estimatedBudget))}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-1.5 py-0.5 text-[10px] rounded font-medium ${
                        t.status === "CLOSING_SOON" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
                      }`}>
                        {t.status === "CLOSING_SOON" ? "Son Gün Yaklaşıyor" : "Açık"}
                      </span>
                      <span className="px-1.5 py-0.5 text-[10px] rounded bg-gray-100 text-gray-600">
                        {t.sector}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <CurrencyConverter />

            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-5 text-white">
              <h3 className="font-semibold mb-2">Kurumsal Paket</h3>
              <p className="text-sm text-blue-100 mb-3">
                Uluslararası ihale takibi, AI çeviri, ülke risk analizi ve daha fazlası.
              </p>
              <p className="text-2xl font-bold mb-3">₺999<span className="text-sm font-normal text-blue-200">/ay</span></p>
              <Link
                href="/premium"
                className="block text-center bg-white text-blue-700 py-2 rounded-lg text-sm font-medium hover:bg-blue-50"
              >
                Planı İncele
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
