import Link from "next/link";
import {
  Calendar,
  MapPin,
  Building2,
  Clock,
  ArrowRight,
  Tag,
  Hash,
} from "lucide-react";
import type { Tender } from "@/lib/data";

const statusStyles: Record<Tender["status"], string> = {
  active: "bg-green-100 text-green-800",
  closed: "bg-red-100 text-red-800",
  upcoming: "bg-yellow-100 text-yellow-800",
};
const statusLabels: Record<Tender["status"], string> = {
  active: "Aktif",
  closed: "Kapandı",
  upcoming: "Yaklaşan",
};

const institutionTypeLabels: Record<Tender["institutionType"], string> = {
  belediye: "Belediye",
  bakanlik: "Bakanlık",
  universite: "Üniversite",
  kit: "KİT",
  diger: "Diğer",
};

function getDaysLeft(deadline: string) {
  const diff = Math.ceil(
    (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (diff < 0) return null;
  if (diff === 0) return "Son gün!";
  return `${diff} gün kaldı`;
}

export default function TenderCard({ tender }: { tender: Tender }) {
  const daysLeft = getDaysLeft(tender.deadline);

  return (
    <article className="group bg-white border border-border rounded-xl hover:shadow-lg hover:border-primary/30 transition-all duration-200">
      <div className="p-5">
        {/* Badges row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[tender.status]}`}
            >
              {statusLabels[tender.status]}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              <Tag size={10} className="mr-1" />
              {tender.category}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
              {institutionTypeLabels[tender.institutionType]}
            </span>
          </div>
          {daysLeft && tender.status === "active" && (
            <span className="text-xs font-medium text-secondary flex items-center gap-1 shrink-0">
              <Clock size={12} />
              {daysLeft}
            </span>
          )}
        </div>

        {/* Title */}
        <Link href={`/ihaleler/${tender.id}`}>
          <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors mb-2 line-clamp-2">
            {tender.title}
          </h3>
        </Link>

        {/* Details */}
        <div className="space-y-1.5 mb-4">
          <div className="flex items-center gap-2 text-sm text-foreground-light">
            <Building2 size={14} className="shrink-0" />
            <span className="truncate">{tender.institution}</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-foreground-light">
            <div className="flex items-center gap-1">
              <MapPin size={14} />
              <span>{tender.city}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar size={14} />
              <span>
                Son:{" "}
                {new Date(tender.deadline).toLocaleDateString("tr-TR")}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-foreground-light">
            <Hash size={12} />
            <span>EKAP: {tender.ekapNo}</span>
          </div>
        </div>

        {/* Cost + link */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div>
            <p className="text-xs text-foreground-light">Tahmini Bedel</p>
            <p className="text-sm font-bold text-primary">
              {tender.estimatedCost}
            </p>
          </div>
          <Link
            href={`/ihaleler/${tender.id}`}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-dark transition-colors"
          >
            Detay
            <ArrowRight
              size={14}
              className="group-hover:translate-x-1 transition-transform"
            />
          </Link>
        </div>
      </div>
    </article>
  );
}
