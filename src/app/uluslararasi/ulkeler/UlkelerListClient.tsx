"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Globe, Search } from "lucide-react";
import { getRiskColor } from "@/lib/international-client";

interface Country {
  id: string;
  countryCode: string;
  name: string;
  nameTr: string;
  riskScore: number;
  activeProjectCount: number;
  flagUrl: string | null;
}

export default function UlkelerListClient() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/international/countries");
        if (res.ok) setCountries(await res.json());
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Yükleniyor...</div>;
  }

  const filtered = search
    ? countries.filter(
        (c) =>
          c.nameTr.toLowerCase().includes(search.toLowerCase()) ||
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.countryCode.toLowerCase().includes(search.toLowerCase())
      )
    : countries;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/uluslararasi" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft size={16} />
          Uluslararası Portal
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Globe size={24} className="text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Ülkeler</h1>
          </div>
        </div>

        <div className="relative mb-6">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ülke ara..."
            className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center">
            <Globe size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Ülke bulunamadı.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((country) => (
              <Link
                key={country.id}
                href={`/uluslararasi/ulkeler/${country.countryCode.toLowerCase()}`}
                className="block"
              >
                <div className="bg-white rounded-xl border p-5 hover:border-blue-300 hover:shadow-sm transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    {country.flagUrl ? (
                      <img src={country.flagUrl} alt={country.nameTr} className="w-8 h-6 object-cover rounded" />
                    ) : (
                      <span className="text-2xl">🏳️</span>
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900">{country.nameTr}</h3>
                      <span className="text-xs text-gray-400">{country.countryCode}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Risk Skoru</span>
                    <span className={`font-medium ${getRiskColor(country.riskScore)}`}>
                      {country.riskScore}/100
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-gray-500">Aktif Proje</span>
                    <span className="font-medium text-gray-700">{country.activeProjectCount}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
