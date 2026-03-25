"use client";

import {
  Megaphone,
  HelpCircle,
  FileEdit,
  CalendarClock,
  Eye,
  Trophy,
  CheckCircle2,
  Circle,
} from "lucide-react";
import type { TimelineEvent, TimelineEventType } from "@/lib/data";

const eventConfig: Record<
  TimelineEventType,
  { icon: React.ElementType; color: string }
> = {
  publish: { icon: Megaphone, color: "text-primary bg-blue-100" },
  question_deadline: { icon: HelpCircle, color: "text-yellow-600 bg-yellow-100" },
  amendment: { icon: FileEdit, color: "text-orange-600 bg-orange-100" },
  application_deadline: { icon: CalendarClock, color: "text-red-600 bg-red-100" },
  opening: { icon: Eye, color: "text-purple-600 bg-purple-100" },
  result: { icon: Trophy, color: "text-accent bg-emerald-100" },
};

export default function TenderTimeline({
  events,
}: {
  events: TimelineEvent[];
}) {
  return (
    <section className="bg-white rounded-xl border border-border p-6">
      <h2 className="text-lg font-semibold text-foreground mb-6">
        İhale Zaman Çizelgesi
      </h2>

      <div className="relative">
        {events.map((event, idx) => {
          const cfg = eventConfig[event.type];
          const Icon = cfg.icon;
          const isLast = idx === events.length - 1;
          const dateFmt = new Date(event.date).toLocaleDateString("tr-TR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          });

          return (
            <div key={idx} className="flex gap-4 relative">
              {/* Vertical line */}
              {!isLast && (
                <div
                  className={`absolute left-[19px] top-10 bottom-0 w-0.5 ${
                    event.completed ? "bg-primary/30" : "bg-border"
                  }`}
                />
              )}

              {/* Icon */}
              <div
                className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  event.completed
                    ? cfg.color.split(" ")[1] + " " + cfg.color.split(" ")[0]
                    : "bg-gray-100 text-foreground-light"
                }`}
              >
                {event.completed ? (
                  <Icon size={18} />
                ) : (
                  <Circle size={18} />
                )}
              </div>

              {/* Content */}
              <div className={`pb-6 flex-1 ${isLast ? "pb-0" : ""}`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <p
                    className={`text-sm font-medium ${
                      event.completed
                        ? "text-foreground"
                        : "text-foreground-light"
                    }`}
                  >
                    {event.label}
                  </p>
                  {event.completed && (
                    <CheckCircle2
                      size={14}
                      className="text-accent"
                    />
                  )}
                </div>
                <p className="text-xs text-foreground-light mt-0.5">
                  {dateFmt}
                </p>
                {event.note && (
                  <p className="text-xs text-secondary mt-1 italic">
                    {event.note}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
