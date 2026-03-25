"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  FileText,
  Clock,
  AlertTriangle,
  XCircle,
  Sparkles,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { useUserStore, type NotificationType } from "@/lib/store";

const typeConfig: Record<
  NotificationType,
  { icon: React.ElementType; color: string; bg: string }
> = {
  new_tender: { icon: Sparkles, color: "text-primary", bg: "bg-blue-100" },
  deadline_reminder: {
    icon: Clock,
    color: "text-secondary",
    bg: "bg-orange-100",
  },
  amendment: {
    icon: FileText,
    color: "text-yellow-600",
    bg: "bg-yellow-100",
  },
  cancellation: {
    icon: XCircle,
    color: "text-red-600",
    bg: "bg-red-100",
  },
  application_update: {
    icon: Check,
    color: "text-accent",
    bg: "bg-green-100",
  },
  rule_match: {
    icon: BellRing,
    color: "text-purple-600",
    bg: "bg-purple-100",
  },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Az önce";
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} saat önce`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} gün önce`;
  return new Date(dateStr).toLocaleDateString("tr-TR");
}

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { notifications, markAsRead, markAllAsRead, deleteNotification } =
    useUserStore();

  const unreadCount = notifications.filter((n) => !n.read).length;
  const recentNotifs = notifications.slice(0, 8);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-foreground-light hover:text-primary transition-colors"
        aria-label="Bildirimler"
        aria-expanded={open}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold text-white bg-secondary rounded-full">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[380px] max-h-[480px] bg-white rounded-xl border border-border shadow-xl z-50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">
              Bildirimler
              {unreadCount > 0 && (
                <span className="ml-1.5 text-xs font-normal text-foreground-light">
                  ({unreadCount} okunmamış)
                </span>
              )}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary-dark font-medium transition-colors"
              >
                <CheckCheck size={14} />
                Tümünü Okundu İşaretle
              </button>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {recentNotifs.length > 0 ? (
              recentNotifs.map((notif) => {
                const cfg = typeConfig[notif.type];
                const Icon = cfg.icon;
                return (
                  <div
                    key={notif.id}
                    className={`flex items-start gap-3 px-4 py-3 border-b border-border/50 hover:bg-background-alt transition-colors ${
                      !notif.read ? "bg-blue-50/50" : ""
                    }`}
                  >
                    <div
                      className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${cfg.bg}`}
                    >
                      <Icon size={16} className={cfg.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`text-xs font-medium line-clamp-1 ${
                            !notif.read
                              ? "text-foreground"
                              : "text-foreground-light"
                          }`}
                        >
                          {notif.title}
                        </p>
                        <div className="flex items-center gap-1 shrink-0">
                          {!notif.read && (
                            <button
                              onClick={() => markAsRead(notif.id)}
                              className="p-0.5 text-foreground-light hover:text-primary transition-colors"
                              title="Okundu işaretle"
                            >
                              <Check size={12} />
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(notif.id)}
                            className="p-0.5 text-foreground-light hover:text-red-500 transition-colors"
                            title="Sil"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-foreground-light line-clamp-2 mt-0.5">
                        {notif.message}
                      </p>
                      <p className="text-[10px] text-foreground-light/60 mt-1">
                        {timeAgo(notif.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-10">
                <Bell
                  size={32}
                  className="mx-auto text-foreground-light/30 mb-2"
                />
                <p className="text-sm text-foreground-light">
                  Bildirim bulunmuyor
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border px-4 py-2.5">
            <Link
              href="/bildirimler"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-1 text-xs font-medium text-primary hover:text-primary-dark transition-colors"
            >
              Tüm Bildirimleri Gör
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
