"use client";

import { Languages, Check } from "lucide-react";

interface LanguageBadgeProps {
  originalLang?: string;
  hasTurkishSummary: boolean;
}

const LANG_LABELS: Record<string, string> = {
  EN: "İngilizce",
  AR: "Arapça",
  RU: "Rusça",
  KA: "Gürcüce",
  AZ: "Azerice",
  KK: "Kazakça",
  TK: "Türkmence",
  UZ: "Özbekçe",
};

export default function LanguageBadge({ originalLang = "EN", hasTurkishSummary }: LanguageBadgeProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
        <Languages size={12} />
        {LANG_LABELS[originalLang] || originalLang}
      </span>
      {hasTurkishSummary && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-200">
          <Check size={12} />
          Türkçe özet mevcut
        </span>
      )}
    </div>
  );
}
