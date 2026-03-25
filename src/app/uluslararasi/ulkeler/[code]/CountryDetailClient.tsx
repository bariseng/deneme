"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Shield, CreditCard, Scale, AlertTriangle, Calendar } from "lucide-react";
import RiskRadar from "@/components/international/RiskRadar";
import CurrencyConverter from "@/components/international/CurrencyConverter";
import { getRiskColor, RISK_INDICATOR_LABELS, getIndicatorColor, formatBudget } from "@/lib/international-client";

interface RiskIndicator {
  indicator: string;
  value: number;
}

interface CountryData {
  id: string;
  countryCode: string;
  name: string;
  nameTr: string;
  riskScore: number;
  paymentReliability: string | null;
  legalFramework: string | null;
  visaRequirements: string | null;
  activeProjectCount: number;
  flagUrl: string | null;
  currency: string | null;
  timezone: string | null;
  riskIndicators: RiskIndicator[];
  openTenderCount: number;
}

interface Tender {
  id: string;
  titleTr: string | null;
  title: string;
  city: string | null;
  sector: string;
  estimatedBudget: string | null;
  currency: string;
  applicationDeadline: string;
  status: string;
}

export default function CountryDetailClient() {
  const params = useParams();
  const code = (params.code as string).toUpperCase();
  const [country, setCountry] = useState<CountryData | null>(null);
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [cRes, tRes] = await Promise.all([
          fetch(`/api/international/countries/${code}`),
          fetch(`/api/international/tenders?country=${code}&limit=10`),
        ]);
        if (cRes.ok) setCountry(await cRes.json());
        if (tRes.ok) {
          const data = await tRes.json();
          setTenders(data.items || []);
        }
      } catch { /* ignore */ } finally { setLoading(false); }
    }
    load();
  }, [code]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Yükleniyor...</div>;
  if (!country) return <div className="min-h-screen flex items-center justify-center text-gray-500">Ülke bulunamadı</div>;

  const risk = getRiskColor(country.riskScore);
  const invertedIndicators = ["payment_risk", "currency_risk", "legal_risk", "security_risk"];
  const daysLeft = (d: string) => Math.max(0, Math.ceil((new Date(d).getTime() - Date.now()) / 86400000));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <Link href="/uluslararasi" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft size={16} />
          Uluslararası Portal
        </Link>

        {/* Country Header */}
        <div className="bg-white rounded-xl border p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            {country.flagUrl ? (
              <img src={country.flagUrl} alt={country.nameTr} className="w-16 h-11 rounded shadow object-cover" />
            ) : (
              <div className="w-16 h-11 bg-gray-200 rounded flex items-center justify-center text-gray-400">{code}</div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{country.nameTr}</h1>
              <p className="text-sm text-gray-500">{country.name} ({country.countryCode})</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className={`text-2xl font-bold ${risk.text}`}>{country.riskScore}</p>
              <p className="text-xs text-gray-500">Güvenlik Skoru</p>
              <p className={`text-xs font-medium ${risk.text}`}>{risk.label}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-900">{country.openTenderCount}</p>
              <p className="text-xs text-gray-500">Açık İhale</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-900">{country.activeProjectCount}</p>
              <p className="text-xs text-gray-500">Aktif Proje</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-gray-900">{country.paymentReliability || "-"}</p>
              <p className="text-xs text-gray-500">Ödeme Güvenilirliği</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Risk Indicators */}
            <div className="bg-white rounded-xl border p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Risk Göstergeleri</h2>
              <div className="flex flex-col md:flex-row items-center gap-6">
                <RiskRadar indicators={country.riskIndicators} size={240} />
                <div className="flex-1 space-y-3 w-full">
                  {country.riskIndicators.map((ind) => {
                    const isInverted = invertedIndicators.includes(ind.indicator);
                    const colorClass = getIndicatorColor(ind.value, isInverted);
                    return (
                      <div key={ind.indicator} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          {RISK_INDICATOR_LABELS[ind.indicator] || ind.indicator}
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isInverted
                                  ? (ind.value <= 30 ? "bg-green-500" : ind.value <= 50 ? "bg-yellow-500" : ind.value <= 70 ? "bg-orange-500" : "bg-red-500")
                                  : (ind.value >= 70 ? "bg-green-500" : ind.value >= 50 ? "bg-yellow-500" : ind.value >= 30 ? "bg-orange-500" : "bg-red-500")
                              }`}
                              style={{ width: `${ind.value}%` }}
                            />
                          </div>
                          <span className={`text-sm font-bold w-8 text-right ${colorClass}`}>
                            {ind.value}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Legal Framework */}
            {country.legalFramework && (
              <div className="bg-white rounded-xl border p-6">
                <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Scale size={16} className="text-indigo-500" />
                  Hukuki Çerçeve
                </h2>
                <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{country.legalFramework}</p>
              </div>
            )}

            {/* Tenders */}
            {tenders.length > 0 && (
              <div className="bg-white rounded-xl border overflow-hidden">
                <div className="px-6 py-4 border-b">
                  <h2 className="font-semibold text-gray-900">Açık İhaleler</h2>
                </div>
                <div className="divide-y">
                  {tenders.map((t) => (
                    <Link key={t.id} href={`/uluslararasi/ihaleler/${t.id}`} className="block px-6 py-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-sm font-medium text-gray-900 truncate">{t.titleTr || t.title}</h3>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                            {t.city && <span className="flex items-center gap-1"><MapPin size={10} />{t.city}</span>}
                            <span className="flex items-center gap-1">
                              <Calendar size={10} />{daysLeft(t.applicationDeadline)} gün
                            </span>
                          </div>
                        </div>
                        {t.estimatedBudget && (
                          <span className="text-sm font-bold text-gray-900 whitespace-nowrap">
                            {t.currency} {formatBudget(Number(t.estimatedBudget))}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <CurrencyConverter defaultCurrency={country.currency || "USD"} />

            {/* Visa Info */}
            {country.visaRequirements && (
              <div className="bg-white rounded-xl border p-5">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Shield size={16} className="text-green-500" />
                  Vize Bilgileri
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">{country.visaRequirements}</p>
              </div>
            )}

            {/* Quick Info */}
            <div className="bg-white rounded-xl border p-5 space-y-3">
              <h3 className="font-semibold text-gray-900">Hızlı Bilgi</h3>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 flex items-center gap-1"><CreditCard size={14} /> Para Birimi</span>
                <span className="font-medium text-gray-900">{country.currency || "-"}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 flex items-center gap-1"><AlertTriangle size={14} /> Saat Dilimi</span>
                <span className="font-medium text-gray-900">{country.timezone || "-"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
