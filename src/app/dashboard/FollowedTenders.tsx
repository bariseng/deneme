"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Heart,
  HeartOff,
  MapPin,
  Building2,
  Calendar,
  Search,
  Tag,
  Hash,
} from "lucide-react";
import type { Tender } from "@/lib/data";
import { mapApiTender } from "@/lib/api-client";
import { useUserStore } from "@/lib/store";
import { EmptyState } from "./DashboardClient";

export default function FollowedTenders() {
  const { followedTenderIds, toggleFollow } = useUserStore();
  const [filter, setFilter] = useState<"all" | "active" | "closed">("all");
  const [fetchedTenders, setFetchedTenders] = useState<Tender[]>([]);

  // Fetch followed tenders from API
  useEffect(() => {
    if (followedTenderIds.length === 0) {
      setFetchedTenders([]);
      return;
    }
    fetch("/api/favorites")
      .then((r) => r.json())
      .then((json) => {
        const items = json.data ?? [];
        const mapped = items
          .filter((item: Record<string, unknown>) => item.tender)
          .map((item: Record<string, unknown>) => mapApiTender(item.tender as Record<string, unknown>));
        // Fallback: if API returns empty, fetch all and filter client-side
        if (mapped.length === 0) {
          return fetch(`/api/tenders?limit=100`)
            .then((r2) => r2.json())
            .then((json2) => {
              const all = (json2.data ?? []).map(mapApiTender);
              setFetchedTenders(all.filter((t: Tender) => followedTenderIds.includes(t.id)));
            });
        }
        setFetchedTenders(mapped);
      })
      .catch(() => setFetchedTenders([]));
  }, [followedTenderIds]);

  const followed = useMemo(() => {
    const list = fetchedTenders.filter((t) =>
      followedTenderIds.includes(t.id)
    );
    if (filter === "all") return list;
    return list.filter((t) => t.status === filter);
  }, [followedTenderIds, filter, fetchedTenders]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Heart size={20} className="text-pink-500" />
            Takip Ettiğim İhaleler
          </h2>
          <p className="text-sm text-foreground-light">
            {followedTenderIds.length} ihale takip ediliyor
          </p>
        </div>

        <div className="flex gap-2">
          {(["all", "active", "closed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                filter === f
                  ? "bg-primary text-white"
                  : "bg-white text-foreground-light border border-border hover:bg-gray-50"
              }`}
            >
              {f === "all" ? "Tümü" : f === "active" ? "Aktif" : "Kapandı"}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {followed.length > 0 ? (
        <div className="space-y-3">
          {followed.map((tender) => (
            <FollowedTenderRow
              key={tender.id}
              tender={tender}
              onUnfollow={() => toggleFollow(tender.id)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border p-8">
          <EmptyState
            icon={Heart}
            message="Takip edilen ihale yok"
            sub="İhale detay sayfasından veya listeden ihaleleri takibe alabilirsiniz."
          />
          <div className="text-center mt-4">
            <Link
              href="/ihaleler"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors"
            >
              <Search size={16} />
              İhale Bul
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function FollowedTenderRow({
  tender,
  onUnfollow,
}: {
  tender: Tender;
  onUnfollow: () => void;
}) {
  const daysLeft = Math.ceil(
    (new Date(tender.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const statusStyles = {
    active: "bg-green-100 text-green-800",
    closed: "bg-red-100 text-red-800",
    upcoming: "bg-yellow-100 text-yellow-800",
  };
  const statusLabels = {
    active: "Aktif",
    closed: "Kapandı",
    upcoming: "Yaklaşan",
  };

  return (
    <div className="bg-white rounded-xl border border-border p-4 hover:border-primary/20 transition-colors">
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[tender.status]}`}
            >
              {statusLabels[tender.status]}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              <Tag size={10} className="mr-1" />
              {tender.category}
            </span>
            <span className="text-xs text-foreground-light flex items-center gap-0.5">
              <Hash size={10} />
              {tender.ekapNo}
            </span>
          </div>

          {/* Title */}
          <Link
            href={`/ihaleler/${tender.id}`}
            className="text-sm font-semibold text-foreground hover:text-primary transition-colors line-clamp-1"
          >
            {tender.title}
          </Link>

          {/* Details */}
          <div className="flex items-center gap-4 mt-1.5 text-xs text-foreground-light flex-wrap">
            <span className="flex items-center gap-1">
              <Building2 size={12} />
              {tender.institution}
            </span>
            <span className="flex items-center gap-1">
              <MapPin size={12} />
              {tender.city}
            </span>
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              Son:{" "}
              {new Date(tender.deadline).toLocaleDateString("tr-TR")}
            </span>
          </div>

          {/* Cost + days left */}
          <div className="flex items-center gap-4 mt-2">
            <span className="text-sm font-bold text-primary">
              {tender.estimatedCost}
            </span>
            {tender.status === "active" && daysLeft > 0 && (
              <span
                className={`text-xs font-medium ${
                  daysLeft <= 3 ? "text-red-600" : "text-secondary"
                }`}
              >
                {daysLeft} gün kaldı
              </span>
            )}
          </div>
        </div>

        {/* Unfollow button */}
        <button
          onClick={onUnfollow}
          className="shrink-0 flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
          aria-label={`${tender.title} takipten çıkar`}
        >
          <HeartOff size={14} />
          <span className="hidden sm:inline">Çıkar</span>
        </button>
      </div>
    </div>
  );
}
