"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
} from "lucide-react";
import { tenders } from "@/lib/data";
import { useUserStore } from "@/lib/store";
import { EmptyState } from "./DashboardClient";

type Range = "7" | "30";

export default function DeadlineCalendar() {
  const { followedTenderIds } = useUserStore();
  const [range, setRange] = useState<Range>("7");
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const days = range === "7" ? 7 : 30;
  const now = Date.now();

  // Upcoming deadlines in range
  const upcoming = useMemo(() => {
    const maxMs = days * 24 * 60 * 60 * 1000;
    return tenders
      .filter((t) => {
        const dl = new Date(t.deadline).getTime();
        return (
          followedTenderIds.includes(t.id) &&
          t.status === "active" &&
          dl - now > 0 &&
          dl - now <= maxMs
        );
      })
      .sort(
        (a, b) =>
          new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
      );
  }, [followedTenderIds, days, now]);

  // Group by date for the timeline
  const grouped = useMemo(() => {
    const map = new Map<string, typeof upcoming>();
    for (const tender of upcoming) {
      const key = tender.deadline;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(tender);
    }
    return Array.from(map.entries()).sort(
      (a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime()
    );
  }, [upcoming]);

  // Mini calendar data
  const calendarDays = useMemo(() => {
    const { year, month } = viewMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay() || 7; // Monday = 1
    const totalDays = lastDay.getDate();

    const deadlineDates = new Set(
      upcoming.map((t) => t.deadline)
    );

    const cells: {
      day: number;
      inMonth: boolean;
      isToday: boolean;
      hasDeadline: boolean;
      date: string;
    }[] = [];

    // Fill preceding empty cells (Mon start)
    for (let i = 1; i < startDay; i++) {
      cells.push({
        day: 0,
        inMonth: false,
        isToday: false,
        hasDeadline: false,
        date: "",
      });
    }

    const today = new Date();
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({
        day: d,
        inMonth: true,
        isToday:
          d === today.getDate() &&
          month === today.getMonth() &&
          year === today.getFullYear(),
        hasDeadline: deadlineDates.has(dateStr),
        date: dateStr,
      });
    }

    return cells;
  }, [viewMonth, upcoming]);

  const monthNames = [
    "Ocak",
    "Şubat",
    "Mart",
    "Nisan",
    "Mayıs",
    "Haziran",
    "Temmuz",
    "Ağustos",
    "Eylül",
    "Ekim",
    "Kasım",
    "Aralık",
  ];

  const prevMonth = () =>
    setViewMonth((v) =>
      v.month === 0
        ? { year: v.year - 1, month: 11 }
        : { ...v, month: v.month - 1 }
    );
  const nextMonth = () =>
    setViewMonth((v) =>
      v.month === 11
        ? { year: v.year + 1, month: 0 }
        : { ...v, month: v.month + 1 }
    );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <CalendarDays size={20} className="text-primary" />
            Yaklaşan Son Başvuru Tarihleri
          </h2>
          <p className="text-sm text-foreground-light">
            Takip ettiğiniz ihalelerin takvim görünümü
          </p>
        </div>

        <div className="flex gap-2">
          {(
            [
              { key: "7", label: "7 Gün" },
              { key: "30", label: "30 Gün" },
            ] as const
          ).map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                range === r.key
                  ? "bg-primary text-white"
                  : "bg-white text-foreground-light border border-border hover:bg-gray-50"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mini calendar */}
        <div className="bg-white rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={prevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Önceki ay"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-foreground">
              {monthNames[viewMonth.month]} {viewMonth.year}
            </span>
            <button
              onClick={nextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Sonraki ay"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 text-center mb-1">
            {["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pa"].map((d) => (
              <div
                key={d}
                className="text-xs font-medium text-foreground-light py-1"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {calendarDays.map((cell, i) => (
              <div
                key={i}
                className={`relative h-9 flex items-center justify-center text-xs rounded-lg ${
                  !cell.inMonth
                    ? ""
                    : cell.isToday
                      ? "bg-primary text-white font-bold"
                      : cell.hasDeadline
                        ? "bg-secondary/10 text-secondary font-semibold cursor-pointer hover:bg-secondary/20"
                        : "text-foreground hover:bg-gray-50"
                }`}
              >
                {cell.inMonth ? cell.day : ""}
                {cell.hasDeadline && !cell.isToday && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-secondary" />
                )}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border">
            <div className="flex items-center gap-1.5 text-xs text-foreground-light">
              <span className="w-3 h-3 rounded bg-primary" />
              Bugün
            </div>
            <div className="flex items-center gap-1.5 text-xs text-foreground-light">
              <span className="w-3 h-3 rounded bg-secondary/30" />
              Son başvuru
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="lg:col-span-2">
          {grouped.length > 0 ? (
            <div className="space-y-4">
              {grouped.map(([date, items]) => {
                const d = new Date(date);
                const daysLeft = Math.ceil(
                  (d.getTime() - now) / (1000 * 60 * 60 * 24)
                );
                return (
                  <div key={date}>
                    {/* Date header */}
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                          daysLeft <= 2
                            ? "bg-red-100 text-red-700"
                            : daysLeft <= 5
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-green-100 text-green-700"
                        }`}
                      >
                        {daysLeft}g
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {d.toLocaleDateString("tr-TR", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                          })}
                        </p>
                        <p className="text-xs text-foreground-light">
                          {items.length} ihale
                        </p>
                      </div>
                    </div>

                    {/* Tenders for this date */}
                    <div className="ml-4 pl-6 border-l-2 border-border space-y-2">
                      {items.map((tender) => (
                        <Link
                          key={tender.id}
                          href={`/ihaleler/${tender.id}`}
                          className="block bg-white rounded-lg border border-border p-3 hover:border-primary/20 hover:shadow-sm transition-all"
                        >
                          <p className="text-sm font-medium text-foreground hover:text-primary line-clamp-1">
                            {tender.title}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-foreground-light">
                            <span className="flex items-center gap-1">
                              <Clock size={11} />
                              {d.toLocaleDateString("tr-TR")}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin size={11} />
                              {tender.city}
                            </span>
                            <span className="font-semibold text-primary">
                              {tender.estimatedCost}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-border p-8">
              <EmptyState
                icon={CalendarDays}
                message={`${days} gün içinde son başvuru tarihi yok`}
                sub="Takip ettiğiniz ihalelerin yaklaşan son tarihleri burada görünecek."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
