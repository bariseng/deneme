"use client";

import { Cloud, CloudOff, RefreshCw } from "lucide-react";

interface Sync {
  provider: string;
  syncEnabled: boolean;
  lastSyncAt: string | null;
}

interface SyncStatusProps {
  syncs: Sync[];
  onConnect?: (provider: string) => void;
}

const PROVIDER_CONFIG: Record<string, { label: string; icon: string }> = {
  GOOGLE: { label: "Google Calendar", icon: "🗓️" },
  OUTLOOK: { label: "Outlook", icon: "📅" },
};

export default function SyncStatus({ syncs, onConnect }: SyncStatusProps) {
  const googleSync = syncs.find((s) => s.provider === "GOOGLE");

  return (
    <div className="bg-white rounded-xl border p-5">
      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <RefreshCw size={16} className="text-blue-500" />
        Takvim Senkronizasyonu
      </h3>

      <div className="space-y-3">
        {Object.entries(PROVIDER_CONFIG).map(([key, cfg]) => {
          const sync = syncs.find((s) => s.provider === key);
          const connected = sync?.syncEnabled;

          return (
            <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-lg">{cfg.icon}</span>
                <div>
                  <p className="text-sm font-medium text-gray-900">{cfg.label}</p>
                  {sync?.lastSyncAt && (
                    <p className="text-[10px] text-gray-400">
                      Son: {new Date(sync.lastSyncAt).toLocaleDateString("tr-TR")}
                    </p>
                  )}
                </div>
              </div>
              {connected ? (
                <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                  <Cloud size={14} /> Bağlı
                </span>
              ) : (
                <button
                  onClick={() => onConnect?.(key)}
                  className="flex items-center gap-1 text-xs text-blue-600 font-medium hover:underline"
                >
                  <CloudOff size={14} /> Bağla
                </button>
              )}
            </div>
          );
        })}
      </div>

      {!googleSync && (
        <p className="text-[10px] text-gray-400 mt-3">
          Google Calendar bağlantısı için GOOGLE_CALENDAR_CLIENT_ID gereklidir.
        </p>
      )}
    </div>
  );
}
