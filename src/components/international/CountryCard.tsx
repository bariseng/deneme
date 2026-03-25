"use client";

import Link from "next/link";
import { MapPin, Building2 } from "lucide-react";
import { getRiskColor } from "@/lib/international-client";

interface CountryCardProps {
  countryCode: string;
  name: string;
  nameTr: string;
  riskScore: number;
  activeProjectCount: number;
  flagUrl: string | null;
  tenderCount?: number;
}

export default function CountryCard({
  countryCode, nameTr, riskScore, activeProjectCount, flagUrl, tenderCount,
}: CountryCardProps) {
  const risk = getRiskColor(riskScore);

  return (
    <Link href={`/uluslararasi/ulkeler/${countryCode}`} className="block">
      <div className="bg-white rounded-xl border hover:shadow-lg transition-all p-5 h-full">
        {/* Flag + Name */}
        <div className="flex items-center gap-3 mb-4">
          {flagUrl ? (
            <img src={flagUrl} alt={nameTr} className="w-10 h-7 rounded object-cover shadow-sm" />
          ) : (
            <div className="w-10 h-7 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-400">
              {countryCode}
            </div>
          )}
          <div>
            <h3 className="font-semibold text-gray-900">{nameTr}</h3>
            <span className="text-xs text-gray-400">{countryCode}</span>
          </div>
        </div>

        {/* Risk Score Gauge */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Güvenlik Skoru</span>
            <span className={`font-bold ${risk.text}`}>{riskScore}/100</span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                riskScore >= 75 ? "bg-green-500" :
                riskScore >= 55 ? "bg-yellow-500" :
                riskScore >= 35 ? "bg-orange-500" : "bg-red-500"
              }`}
              style={{ width: `${riskScore}%` }}
            />
          </div>
          <p className={`text-xs font-medium mt-1 ${risk.text}`}>{risk.label}</p>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Building2 size={12} />
            <span>{activeProjectCount} aktif proje</span>
          </div>
          {tenderCount !== undefined && (
            <div className="flex items-center gap-1 text-xs text-blue-600 font-medium">
              <MapPin size={12} />
              {tenderCount} açık ihale
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
