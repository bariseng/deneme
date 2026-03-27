"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Calendar,
  MapPin,
  Building2,
  Loader2,
} from "lucide-react";
import type { Tender } from "@/lib/data";
import { mapApiTender, type ApiTender } from "@/lib/api-client";

interface Props {
  currentId: string;
  category: string;
  institution: string;
  budgetValue: number;
}

export default function SimilarTenders({
  currentId,
  category,
  institution,
  budgetValue,
}: Props) {
  const [similar, setSimilar] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // Fetch tenders with matching category to find similar ones
    const typeParam = encodeURIComponent(category);
    fetch(`/api/tenders?type=${typeParam}&limit=6`)
      .then((r) => r.json())
      .then((json) => {
        const mapped = (json.data ?? [])
          .map((t: ApiTender) => mapApiTender(t))
          .filter((t: Tender) => t.id !== currentId)
          .slice(0, 4);
        setSimilar(mapped);
      })
      .catch(() => setSimilar([]))
      .finally(() => setLoading(false));
  }, [currentId, category]);

  if (loading) {
    return (
      <section className="bg-white rounded-xl border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Benzer İhaleler
        </h2>
        <div className="flex items-center justify-center py-8">
          <Loader2 size={24} className="animate-spin text-primary" />
        </div>
      </section>
    );
  }

  if (similar.length === 0) return null;

  return (
    <section className="bg-white rounded-xl border border-border p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4">
        Benzer İhaleler
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {similar.map((tender) => (
          <Link
            key={tender.id}
            href={`/ihaleler/${tender.id}`}
            className="block p-3 rounded-lg border border-border hover:border-primary/20 hover:bg-primary/5 transition-all group"
          >
            <p className="text-sm font-medium text-foreground group-hover:text-primary line-clamp-2 mb-1.5 transition-colors">
              {tender.title}
            </p>
            <div className="flex items-center gap-3 text-xs text-foreground-light flex-wrap">
              <span className="flex items-center gap-1">
                <Building2 size={11} />
                {tender.institution}
              </span>
              <span className="flex items-center gap-1">
                <MapPin size={11} />
                {tender.city}
              </span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs font-bold text-primary">
                {tender.estimatedCost}
              </span>
              <span className="text-xs text-foreground-light flex items-center gap-0.5">
                <Calendar size={11} />
                Son:{" "}
                {new Date(tender.deadline).toLocaleDateString("tr-TR")}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
