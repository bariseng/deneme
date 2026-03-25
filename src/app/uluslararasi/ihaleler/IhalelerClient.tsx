"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, MapPin, Search } from "lucide-react";
import LanguageBadge from "@/components/international/LanguageBadge";
import { formatBudget, formatCurrency, convertToTRY, SECTORS } from "@/lib/international-client";

interface Tender {
  id: string;
  title: string;
  titleTr: string | null;
  country: string;
  city: string | null;
  sector: string;
  estimatedBudget: string | null;
  currency: string;
  descriptionTr: string | null;
  applicationDeadline: string;
  sourcePlatform: string;
  status: string;
}

interface Country {
  countryCode: string;
  nameTr: string;
}

export default function IhalelerClient() {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [countryFilter, setCountryFilter] = useState("");
  const [sectorFilter, setSectorFilter] = useState("");
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetch("/api/international/countries").then(async (r) => {
      if (r.ok) setCountries(await r.json());
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (countryFilter) params.set("country", countryFilter);
      if (sectorFilter) params.set("sector", sectorFilter);
      params.set("limit", "50");

      const res = await fetch(`/api/international/tenders?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTenders(data.items || []);
        setTotal(data.total || 0);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [countryFilter, sectorFilter]);

  useEffect(() => { load(); }, [load]);

  const daysLeft = (d: string) => Math.max(0, Math.ceil((new Date(d).getTime() - Date.now()) / 86400000));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/uluslararasi" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft size={16} />
          Uluslararası Portal
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Uluslararası İhaleler</h1>
            <p className="text-sm text-gray-500">{total} ihale bulundu</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">Tüm Ülkeler</option>
            {countries.map((c) => (
              <option key={c.countryCode} value={c.countryCode}>{c.nameTr}</option>
            ))}
          </select>
          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">Tüm Sektörler</option>
            {SECTORS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Yükleniyor...</div>
        ) : tenders.length === 0 ? (
          <div className="text-center py-12">
            <Search size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">İhale bulunamadı.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tenders.map((t) => {
              const days = daysLeft(t.applicationDeadline);
              const budget = t.estimatedBudget ? Number(t.estimatedBudget) : 0;
              const tryBudget = budget ? convertToTRY(budget, t.currency) : 0;

              return (
                <Link key={t.id} href={`/uluslararasi/ihaleler/${t.id}`} className="block">
                  <div className="bg-white rounded-xl border p-5 hover:shadow-md transition-shadow">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {t.titleTr || t.title}
                        </h3>
                        {t.titleTr && (
                          <p className="text-xs text-gray-400 mb-2">{t.title}</p>
                        )}
                        <div className="flex items-center gap-3 flex-wrap text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <MapPin size={12} />
                            {countries.find((c) => c.countryCode === t.country)?.nameTr || t.country}
                            {t.city && ` / ${t.city}`}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            <span className={days <= 14 ? "text-red-600 font-medium" : ""}>
                              {days} gün kaldı
                            </span>
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                            {t.sourcePlatform}
                          </span>
                        </div>
                      </div>

                      {budget > 0 && (
                        <div className="text-right shrink-0">
                          <p className="text-lg font-bold text-gray-900">
                            {formatCurrency(budget, t.currency)}
                          </p>
                          <p className="text-xs text-gray-400">
                            ≈ {formatBudget(tryBudget)} ₺
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-xs rounded font-medium ${
                          t.status === "CLOSING_SOON" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
                        }`}>
                          {t.status === "CLOSING_SOON" ? "Son Gün Yaklaşıyor" : "Açık"}
                        </span>
                        <span className="px-2 py-0.5 text-xs rounded bg-indigo-50 text-indigo-700">
                          {SECTORS.find((s) => s.value === t.sector)?.label || t.sector}
                        </span>
                      </div>
                      <LanguageBadge hasTurkishSummary={!!t.descriptionTr} />
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
