import Link from "next/link";
import {
  Calendar,
  MapPin,
  Building2,
  ArrowRight,
} from "lucide-react";
import { tenders, type Tender } from "@/lib/data";

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
  // Score-based similarity: same category, same institution, budget proximity
  const scored = tenders
    .filter((t) => t.id !== currentId)
    .map((t) => {
      let score = 0;
      if (t.category === category) score += 3;
      if (t.institution === institution) score += 5;
      // Budget within 2x range
      const ratio =
        budgetValue > 0
          ? Math.min(t.estimatedCostValue, budgetValue) /
            Math.max(t.estimatedCostValue, budgetValue)
          : 0;
      if (ratio > 0.3) score += Math.round(ratio * 3);
      return { tender: t, score };
    })
    .filter((s) => s.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  if (scored.length === 0) return null;

  return (
    <section className="bg-white rounded-xl border border-border p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4">
        Benzer İhaleler
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {scored.map(({ tender }) => (
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
