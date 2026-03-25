"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, Calendar } from "lucide-react";
import { formatDateTR, daysUntil } from "@/lib/calendar-client";

interface ConflictGroup {
  date: string;
  events: { id: string; title: string; tenderId: string | null; startDate: string }[];
}

export default function CakismalarClient() {
  const [conflicts, setConflicts] = useState<ConflictGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/calendar/conflicts");
        if (res.ok) setConflicts(await res.json());
      } catch { /* ignore */ } finally { setLoading(false); }
    }
    load();
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Yükleniyor...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <Link href="/takvim" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft size={16} />
          Takvim
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3 mb-2">
          <AlertTriangle size={24} className="text-orange-500" />
          Çakışan İhaleler
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Aynı gün kapanan ihaleleri kontrol edin ve önceliklendirin.
        </p>

        {conflicts.length === 0 ? (
          <div className="bg-white rounded-xl border p-8 text-center">
            <Calendar size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">Çakışan ihale bulunmuyor. Takvimizin düzenli!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {conflicts.map((c) => {
              const days = daysUntil(c.date);
              return (
                <div key={c.date} className="bg-white rounded-xl border overflow-hidden">
                  <div className="px-5 py-3 bg-orange-50 border-b border-orange-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={16} className="text-orange-600" />
                      <span className="font-semibold text-orange-800">{formatDateTR(c.date)}</span>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      days <= 3 ? "bg-red-100 text-red-700" : days <= 7 ? "bg-orange-100 text-orange-700" : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {days === 0 ? "Bugün!" : `${days} gün kaldı`}
                    </span>
                  </div>
                  <div className="p-5">
                    <p className="text-sm text-gray-600 mb-3">
                      Bu tarihte <strong>{c.events.length} ihale</strong> son başvuru günü:
                    </p>
                    <div className="space-y-2">
                      {c.events.map((evt, i) => (
                        <div key={evt.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <span className="w-6 h-6 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center text-xs font-bold">
                            {i + 1}
                          </span>
                          <span className="text-sm text-gray-900 flex-1">{evt.title.replace("Son Başvuru: ", "")}</span>
                          {evt.tenderId && (
                            <Link href={`/ihaleler/${evt.tenderId}`} className="text-xs text-blue-600 hover:underline">
                              İhaleyi Gör
                            </Link>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-700">
                        💡 <strong>Öneri:</strong> Çakışan ihalelerde öncelik belirlemeniz önerilir.
                        Bütçe büyüklüğü ve kazanma olasılığına göre önceliklendirin.
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
