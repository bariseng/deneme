"use client";

import { useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { EVENT_TYPE_CONFIG } from "@/lib/calendar-client";

interface CalendarEvent {
  id: string;
  title: string;
  eventType: string;
  startDate: string;
  endDate?: string | null;
  description?: string | null;
  tenderId?: string | null;
}

interface CalendarViewProps {
  events: CalendarEvent[];
  onEventClick?: (eventId: string) => void;
  onDateClick?: (date: string) => void;
}

export default function CalendarView({ events, onEventClick, onDateClick }: CalendarViewProps) {
  const calRef = useRef<FullCalendar>(null);

  const fcEvents = events.map((e) => {
    const cfg = EVENT_TYPE_CONFIG[e.eventType] || EVENT_TYPE_CONFIG.OZEL;
    return {
      id: e.id,
      title: e.title,
      start: e.startDate,
      end: e.endDate || undefined,
      backgroundColor: cfg.color,
      borderColor: cfg.color,
      textColor: "#ffffff",
      extendedProps: { eventType: e.eventType, description: e.description, tenderId: e.tenderId },
    };
  });

  return (
    <div className="bg-white rounded-xl border p-4">
      <FullCalendar
        ref={calRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locale="tr"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        buttonText={{
          today: "Bugün",
          month: "Ay",
          week: "Hafta",
          day: "Gün",
        }}
        events={fcEvents}
        eventClick={(info) => {
          if (onEventClick) onEventClick(info.event.id);
        }}
        dateClick={(info) => {
          if (onDateClick) onDateClick(info.dateStr);
        }}
        height="auto"
        dayMaxEvents={3}
        firstDay={1}
        eventDisplay="block"
      />
    </div>
  );
}
