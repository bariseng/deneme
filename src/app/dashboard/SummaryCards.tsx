"use client";

import { useMemo } from "react";
import { Heart, CalendarClock, TrendingDown, Sparkles } from "lucide-react";
import { tenders } from "@/lib/data";
import { useUserStore } from "@/lib/store";

export default function SummaryCards() {
  const { followedTenderIds, applications } = useUserStore();

  const stats = useMemo(() => {
    const now = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;

    const followed = followedTenderIds.length;

    const closingThisWeek = tenders.filter(
      (t) =>
        followedTenderIds.includes(t.id) &&
        t.status === "active" &&
        new Date(t.deadline).getTime() - now > 0 &&
        new Date(t.deadline).getTime() - now <= oneWeek
    ).length;

    const newThisWeek = tenders.filter(
      (t) => now - new Date(t.publishDate).getTime() <= oneWeek
    ).length;

    const pendingApps = applications.filter(
      (a) => a.status === "pending"
    ).length;

    return [
      {
        label: "Takip Edilen",
        value: followed,
        icon: Heart,
        color: "text-pink-600",
        bg: "bg-pink-50",
      },
      {
        label: "Bu Hafta Kapanan",
        value: closingThisWeek,
        icon: CalendarClock,
        color: "text-secondary",
        bg: "bg-orange-50",
      },
      {
        label: "Yeni Eklenen (7 Gün)",
        value: newThisWeek,
        icon: Sparkles,
        color: "text-accent",
        bg: "bg-emerald-50",
      },
      {
        label: "Bekleyen Başvuru",
        value: pendingApps,
        icon: TrendingDown,
        color: "text-primary",
        bg: "bg-blue-50",
      },
    ];
  }, [followedTenderIds, applications]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-border p-4 flex items-center gap-3"
          >
            <div
              className={`w-11 h-11 rounded-lg flex items-center justify-center ${stat.bg}`}
            >
              <Icon size={20} className={stat.color} />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-foreground">
                {stat.value}
              </p>
              <p className="text-xs text-foreground-light">{stat.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
