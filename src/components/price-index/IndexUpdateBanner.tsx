"use client";

import { Database, Calendar, TrendingUp } from "lucide-react";

interface IndexUpdateBannerProps {
  totalSamples: number;
  totalItems: number;
  latestMonth?: string;
}

function formatMonth(dateStr: string) {
  const date = new Date(dateStr);
  const months = [
    "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
    "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
  ];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

export default function IndexUpdateBanner({ totalSamples, totalItems, latestMonth }: IndexUpdateBannerProps) {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-4 text-white">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Database size={20} className="opacity-80" />
          <div>
            <p className="font-semibold text-sm">İhale Fiyat Endeksi</p>
            <p className="text-xs text-blue-200">
              {totalSamples.toLocaleString("tr-TR")} ihale sonucundan derlendi
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1">
            <TrendingUp size={14} className="opacity-80" />
            {totalItems} kalem
          </span>
          {latestMonth && (
            <span className="flex items-center gap-1">
              <Calendar size={14} className="opacity-80" />
              Son güncelleme: {formatMonth(latestMonth)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
