"use client";

import { CalendarDays, Clock } from "lucide-react";
import { EVENT_TYPE_CONFIG, formatDateTimeTR } from "@/lib/calendar-client";

interface Event {
  id: string;
  title: string;
  eventType: string;
  startDate: string;
}

interface DailyDigestProps {
  todayEvents: Event[];
  weekEvents: Event[];
}

export default function DailyDigest({ todayEvents, weekEvents }: DailyDigestProps) {
  return (
    <div className="bg-white rounded-xl border p-5">
      <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
        <CalendarDays size={18} className="text-blue-600" />
        {todayEvents.length > 0
          ? `Bugün ${todayEvents.length} işiniz var`
          : "Bugün programınız boş"}
      </h3>

      {todayEvents.length > 0 && (
        <div className="space-y-2 mb-4">
          {todayEvents.map((e) => {
            const cfg = EVENT_TYPE_CONFIG[e.eventType] || EVENT_TYPE_CONFIG.OZEL;
            return (
              <div key={e.id} className="flex items-center gap-3 p-2 rounded-lg" style={{ backgroundColor: cfg.bgColor }}>
                <div className="w-1.5 h-8 rounded-full" style={{ backgroundColor: cfg.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{e.title}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock size={10} />
                    {formatDateTimeTR(e.startDate)}
                  </p>
                </div>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ color: cfg.color, backgroundColor: cfg.bgColor }}>
                  {cfg.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {weekEvents.length > 0 && (
        <div className="pt-3 border-t">
          <p className="text-xs font-medium text-gray-500 mb-2">Bu hafta ({weekEvents.length} etkinlik)</p>
          <div className="space-y-1.5">
            {weekEvents.slice(0, 5).map((e) => {
              const cfg = EVENT_TYPE_CONFIG[e.eventType] || EVENT_TYPE_CONFIG.OZEL;
              return (
                <div key={e.id} className="flex items-center gap-2 text-xs text-gray-600">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />
                  <span className="truncate flex-1">{e.title}</span>
                  <span className="text-gray-400 shrink-0">{formatDateTimeTR(e.startDate)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
