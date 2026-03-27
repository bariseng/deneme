"use client";

import { useEffect, useMemo, useState } from "react";
import { Heart, CalendarClock, TrendingDown, Sparkles } from "lucide-react";
import { useUserStore } from "@/lib/store";

interface KpiData {
  closingThisWeek: number;
  newThisWeek: number;
}

export default function SummaryCards() {
  const { followedTenderIds, applications } = useUserStore();
  const [kpi, setKpi] = useState<KpiData>({ closingThisWeek: 0, newThisWeek: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard?section=kpis")
      .then((r) => r.json())
      .then((json) => {
        const data = json.data ?? json;
        setKpi({
          closingThisWeek: data.closingThisWeek ?? 0,
          newThisWeek: data.newThisWeek ?? 0,
        });
      })
      .catch(() => setKpi({ closingThisWeek: 0, newThisWeek: 0 }))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const followed = followedTenderIds.length;
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
        value: loading ? "..." : kpi.closingThisWeek,
        icon: CalendarClock,
        color: "text-secondary",
        bg: "bg-orange-50",
      },
      {
        label: "Yeni Eklenen (7 Gün)",
        value: loading ? "..." : kpi.newThisWeek,
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
  }, [followedTenderIds, applications, kpi, loading]);

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
