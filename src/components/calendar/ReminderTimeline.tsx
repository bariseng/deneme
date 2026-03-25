"use client";

import { Bell, Clock } from "lucide-react";
import { EVENT_TYPE_CONFIG, formatDateTimeTR, daysUntil } from "@/lib/calendar-client";

interface Reminder {
  id: string;
  message: string;
  scheduledAt: string;
  channel: string;
  aiGenerated: boolean;
  event: {
    id: string;
    title: string;
    eventType: string;
    startDate: string;
  };
}

interface ReminderTimelineProps {
  reminders: Reminder[];
}

export default function ReminderTimeline({ reminders }: ReminderTimelineProps) {
  if (reminders.length === 0) {
    return (
      <div className="bg-white rounded-xl border p-5 text-center">
        <Bell size={24} className="mx-auto text-gray-300 mb-2" />
        <p className="text-sm text-gray-500">Yaklaşan hatırlatma yok</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border p-5">
      <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
        <Bell size={18} className="text-blue-600" />
        Yaklaşan Hatırlatmalar
      </h3>
      <div className="space-y-3">
        {reminders.map((r) => {
          const cfg = EVENT_TYPE_CONFIG[r.event.eventType] || EVENT_TYPE_CONFIG.OZEL;
          const days = daysUntil(r.scheduledAt);

          return (
            <div key={r.id} className="flex items-start gap-3 relative pl-4">
              {/* Timeline line */}
              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gray-200" />
              <div className="absolute left-[-3px] top-1.5 w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />

              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700">{r.message}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-gray-400 flex items-center gap-1">
                    <Clock size={10} />
                    {days === 0 ? "Bugün" : `${days} gün sonra`}
                  </span>
                  {r.aiGenerated && (
                    <span className="text-[10px] bg-purple-50 text-purple-600 px-1 py-0.5 rounded">AI</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
