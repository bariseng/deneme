"use client";

import Link from "next/link";
import { Calendar, ExternalLink } from "lucide-react";
import ImpactBadge from "./ImpactBadge";
import { SOURCE_LABELS, CATEGORY_LABELS } from "@/lib/legal-scanner-client";

interface LegalUpdateCardProps {
  id: string;
  title: string;
  source: string;
  category: string;
  impactLevel: string;
  summary: string;
  publishDate: string;
  originalUrl: string;
}

export default function LegalUpdateCard({
  id, title, source, category, impactLevel, summary, publishDate, originalUrl,
}: LegalUpdateCardProps) {
  return (
    <div className="bg-white rounded-xl border hover:shadow-md transition-shadow p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-600">
            {SOURCE_LABELS[source] || source}
          </span>
          <span className="px-2 py-0.5 text-xs font-medium rounded bg-indigo-50 text-indigo-700">
            {CATEGORY_LABELS[category] || category}
          </span>
        </div>
        <ImpactBadge level={impactLevel} size="sm" />
      </div>

      <Link href={`/mevzuat/${id}`} className="block group mb-2">
        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
          {title}
        </h3>
      </Link>

      <p className="text-sm text-gray-500 line-clamp-2 mb-3">{summary}</p>

      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs text-gray-400">
          <Calendar size={12} />
          {new Date(publishDate).toLocaleDateString("tr-TR", {
            day: "numeric", month: "long", year: "numeric",
          })}
        </span>
        <a
          href={originalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
        >
          Kaynak <ExternalLink size={10} />
        </a>
      </div>
    </div>
  );
}
