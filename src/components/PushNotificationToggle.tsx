"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import {
  requestNotificationPermission,
  isNotificationSupported,
  getNotificationPermission,
  showLocalNotification,
} from "@/lib/push-notifications";

export default function PushNotificationToggle() {
  const [permission, setPermission] = useState<NotificationPermission | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(isNotificationSupported());
    setPermission(getNotificationPermission());
  }, []);

  const handleEnable = useCallback(async () => {
    setLoading(true);
    const result = await requestNotificationPermission();
    setPermission(result);

    if (result === "granted") {
      await showLocalNotification("İhalePro Bildirimleri Aktif", {
        body: "Artık ihale bildirimleri alacaksınız.",
        tag: "permission-granted",
      });
    }
    setLoading(false);
  }, []);

  if (!supported) return null;

  return (
    <div className="flex items-center justify-between p-3 bg-background-alt rounded-lg">
      <div className="flex items-center gap-3">
        {permission === "granted" ? (
          <Bell size={18} className="text-primary" />
        ) : (
          <BellOff size={18} className="text-foreground-light" />
        )}
        <div>
          <p className="text-sm font-medium text-foreground">
            Push Bildirimleri
          </p>
          <p className="text-xs text-foreground-light">
            {permission === "granted"
              ? "Bildirimler aktif"
              : permission === "denied"
                ? "Tarayıcı ayarlarından etkinleştirin"
                : "İhale bildirimleri alın"}
          </p>
        </div>
      </div>
      {permission !== "granted" && permission !== "denied" && (
        <button
          onClick={handleEnable}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-dark text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
        >
          {loading ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Bell size={12} />
          )}
          Etkinleştir
        </button>
      )}
      {permission === "granted" && (
        <span className="text-xs text-accent font-medium px-2 py-1 bg-green-50 rounded-full">
          Aktif
        </span>
      )}
    </div>
  );
}
