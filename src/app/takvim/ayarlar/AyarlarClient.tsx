"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import SyncStatus from "@/components/calendar/SyncStatus";

interface Sync {
  provider: string;
  syncEnabled: boolean;
  lastSyncAt: string | null;
}

export default function AyarlarClient() {
  const [syncs, setSyncs] = useState<Sync[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/calendar/sync/google");
        if (res.ok) setSyncs(await res.json());
      } catch { /* ignore */ } finally { setLoading(false); }
    }
    load();
  }, []);

  async function handleConnect(provider: string) {
    try {
      const res = await fetch("/api/calendar/sync/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syncEnabled: true }),
      });
      if (res.ok) {
        const sync = await res.json();
        setSyncs((prev) => {
          const filtered = prev.filter((s) => s.provider !== provider);
          return [...filtered, sync];
        });
      }
    } catch { /* ignore */ }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Yükleniyor...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <Link href="/takvim" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft size={16} />
          Takvim
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 mb-6">Takvim Ayarları</h1>

        <div className="space-y-6">
          <SyncStatus syncs={syncs} onConnect={handleConnect} />

          {/* Export */}
          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Takvim Dışa Aktarma</h3>
            <p className="text-sm text-gray-500 mb-3">
              Tüm etkinliklerinizi .ics formatında indirip herhangi bir takvim uygulamasına aktarabilirsiniz.
            </p>
            <a
              href="/api/calendar/export"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              <Download size={14} />
              .ics Dosyasını İndir
            </a>
          </div>

          {/* Reminder Preferences */}
          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Hatırlatma Tercihleri</h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">Son Başvuru Hatırlatmaları</p>
                  <p className="text-xs text-gray-500">7, 3 ve 1 gün önce</p>
                </div>
                <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 rounded" />
              </label>
              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">Günlük Sabah Özeti</p>
                  <p className="text-xs text-gray-500">Her sabah 08:00&apos;de</p>
                </div>
                <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 rounded" />
              </label>
              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">Çakışma Uyarıları</p>
                  <p className="text-xs text-gray-500">Aynı gün kapanan ihaleler</p>
                </div>
                <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 rounded" />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
