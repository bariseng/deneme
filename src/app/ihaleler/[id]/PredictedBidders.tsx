"use client";

import Link from "next/link";
import {
  Users,
  MapPin,
  Star,
  TrendingUp,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { predictBidders } from "@/lib/companies";
import { formatCurrency } from "@/lib/format";

interface Props {
  category: string;
  city: string;
  budgetValue: number;
}

export default function PredictedBidders({
  category,
  city,
  budgetValue,
}: Props) {
  const bidders = predictBidders(category, city, budgetValue);

  if (bidders.length === 0) return null;

  return (
    <section className="bg-white rounded-xl border border-border p-6">
      <h2 className="text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
        <Sparkles size={20} className="text-secondary" />
        Bu İhaleye Kimler Girebilir?
      </h2>
      <p className="text-xs text-foreground-light mb-4">
        Geçmiş ihale verilerine dayalı tahmin ({bidders.length} potansiyel
        firma)
      </p>

      <div className="space-y-3">
        {bidders.map((company) => {
          const winRate = Math.round(
            (company.wonTenderCount /
              (company.wonTenderCount + company.lostTenderCount)) *
              100
          );
          return (
            <Link
              key={company.id}
              href={`/firmalar/${company.id}`}
              className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/20 hover:bg-primary/5 transition-all group"
            >
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                <Users size={18} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                  {company.name}
                </p>
                <div className="flex items-center gap-3 text-xs text-foreground-light mt-0.5">
                  <span className="flex items-center gap-0.5">
                    <MapPin size={10} />
                    {company.city}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Star size={10} className="text-yellow-500" />
                    {company.rating.toFixed(1)}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <TrendingUp size={10} />
                    %{winRate} kazanma
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-bold text-primary">
                  {company.wonTenderCount} ihale
                </p>
                <p className="text-[10px] text-foreground-light">kazanıldı</p>
              </div>
              <ChevronRight
                size={14}
                className="text-foreground-light shrink-0"
              />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
