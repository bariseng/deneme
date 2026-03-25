"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { CalendarDays, Plus, Download, Settings, X, AlertTriangle } from "lucide-react";
import CalendarView from "@/components/calendar/CalendarView";
import DailyDigest from "@/components/calendar/DailyDigest";
import ReminderTimeline from "@/components/calendar/ReminderTimeline";
import ConflictAlert from "@/components/calendar/ConflictAlert";
import { EVENT_TYPE_CONFIG, EVENT_TYPES } from "@/lib/calendar-client";

interface CalendarEvent {
  id: string;
  title: string;
  eventType: string;
  startDate: string;
  endDate?: string | null;
  description?: string | null;
  tenderId?: string | null;
}

interface ConflictGroup {
  date: string;
  events: { id: string; title: string }[];
}

interface Reminder {
  id: string;
  message: string;
  scheduledAt: string;
  channel: string;
  aiGenerated: boolean;
  event: { id: string; title: string; eventType: string; startDate: string };
}

export default function TakvimClient() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [conflicts, setConflicts] = useState<ConflictGroup[]>([]);
  const [todayEvents, setTodayEvents] = useState<CalendarEvent[]>([]);
  const [weekEvents, setWeekEvents] = useState<CalendarEvent[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // New event form
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("OZEL");
  const [newDate, setNewDate] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const load = useCallback(async () => {
    try {
      const [evtRes, conflictRes, summaryRes] = await Promise.all([
        fetch("/api/calendar/events"),
        fetch("/api/calendar/conflicts"),
        fetch("/api/calendar/daily-summary"),
      ]);

      if (evtRes.ok) setEvents(await evtRes.json());
      if (conflictRes.ok) setConflicts(await conflictRes.json());
      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setTodayEvents(data.todayEvents || []);
        setWeekEvents(data.weekEvents || []);
        setReminders(data.upcomingReminders || []);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleDateClick(date: string) {
    setSelectedDate(date);
    setNewDate(date);
    setShowModal(true);
  }

  function handleEventClick(eventId: string) {
    const evt = events.find((e) => e.id === eventId);
    if (evt) setSelectedEvent(evt);
  }

  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle || !newDate) return;

    try {
      const res = await fetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          eventType: newType,
          startDate: new Date(newDate).toISOString(),
          description: newDesc,
          reminderDays: [1, 3],
        }),
      });
      if (res.ok) {
        setShowModal(false);
        setNewTitle(""); setNewDesc(""); setNewType("OZEL");
        load();
      }
    } catch { /* ignore */ }
  }

  async function handleDeleteEvent(id: string) {
    try {
      await fetch(`/api/calendar/events/${id}`, { method: "DELETE" });
      setSelectedEvent(null);
      load();
    } catch { /* ignore */ }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Yükleniyor...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <CalendarDays size={24} className="text-blue-600" />
              Akıllı Takvim
            </h1>
            <p className="text-gray-500 text-sm mt-1">İhale tarihlerini takip edin, hatırlatmalar alın</p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/api/calendar/export"
              className="inline-flex items-center gap-1.5 bg-white border px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              <Download size={14} /> .ics İndir
            </a>
            <Link
              href="/takvim/ayarlar"
              className="inline-flex items-center gap-1.5 bg-white border px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              <Settings size={14} /> Ayarlar
            </Link>
            <button
              onClick={() => { setSelectedDate(""); setNewDate(""); setShowModal(true); }}
              className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              <Plus size={14} /> Etkinlik Ekle
            </button>
          </div>
        </div>

        {/* Conflict Alert */}
        {conflicts.length > 0 && (
          <div className="mb-6">
            <ConflictAlert conflicts={conflicts} />
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          {Object.entries(EVENT_TYPE_CONFIG).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5 text-xs text-gray-600">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: cfg.color }} />
              {cfg.label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-3">
            <CalendarView
              events={events}
              onEventClick={handleEventClick}
              onDateClick={handleDateClick}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <DailyDigest todayEvents={todayEvents} weekEvents={weekEvents} />
            <ReminderTimeline reminders={reminders} />
          </div>
        </div>
      </div>

      {/* New Event Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Yeni Etkinlik</h2>
              <button onClick={() => setShowModal(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Başlık *</label>
                <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tür</label>
                <select value={newType} onChange={(e) => setNewType(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-white">
                  {EVENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tarih *</label>
                <input type="datetime-local" value={newDate} onChange={(e) => setNewDate(e.target.value)} required
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
                <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={2}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <button type="submit"
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700">
                Etkinlik Oluştur
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Event Detail Popover */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: EVENT_TYPE_CONFIG[selectedEvent.eventType]?.color || "#8b5cf6" }} />
                <h2 className="text-lg font-semibold text-gray-900">{selectedEvent.title}</h2>
              </div>
              <button onClick={() => setSelectedEvent(null)}><X size={20} className="text-gray-400" /></button>
            </div>
            {selectedEvent.description && (
              <p className="text-sm text-gray-600 mb-3">{selectedEvent.description}</p>
            )}
            <p className="text-sm text-gray-500 mb-4">
              📅 {new Date(selectedEvent.startDate).toLocaleDateString("tr-TR", {
                day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
              })}
            </p>
            <div className="flex gap-2">
              {selectedEvent.tenderId && (
                <Link href={`/ihaleler/${selectedEvent.tenderId}`}
                  className="flex-1 text-center bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
                  İhaleyi Gör
                </Link>
              )}
              <button onClick={() => handleDeleteEvent(selectedEvent.id)}
                className="flex-1 text-center bg-red-50 text-red-600 py-2 rounded-lg text-sm font-medium hover:bg-red-100">
                Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
