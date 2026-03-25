"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Heart,
  FileCheck,
  CalendarDays,
  Bell,
  TrendingUp,
  Clock,
  PlusCircle,
  Star,
  ChevronRight,
  Settings,
  LayoutDashboard,
} from "lucide-react";
import { tenders } from "@/lib/data";
import { useUserStore } from "@/lib/store";
import SummaryCards from "./SummaryCards";
import FollowedTenders from "./FollowedTenders";
import AppliedTenders from "./AppliedTenders";
import DeadlineCalendar from "./DeadlineCalendar";
import NotificationSettings from "./NotificationSettings";

type Tab =
  | "overview"
  | "followed"
  | "applications"
  | "calendar"
  | "notifications";

const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "overview", label: "Genel Bakış", icon: LayoutDashboard },
  { key: "followed", label: "Takip Ettiklerim", icon: Heart },
  { key: "applications", label: "Başvurularım", icon: FileCheck },
  { key: "calendar", label: "Takvim", icon: CalendarDays },
  { key: "notifications", label: "Bildirimler", icon: Bell },
];

export default function DashboardClient() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  return (
    <div className="bg-background-alt min-h-screen">
      {/* Page header */}
      <div className="bg-gradient-to-r from-background-dark to-primary py-8 md:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
            Kontrol Paneli
          </h1>
          <p className="text-blue-200 text-sm">
            İhalelerinizi yönetin, başvurularınızı takip edin
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tab navigation */}
        <div className="flex gap-1 overflow-x-auto pb-1 mb-6 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-primary text-white shadow-sm"
                    : "bg-white text-foreground-light hover:bg-gray-50 border border-border"
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "followed" && <FollowedTenders />}
        {activeTab === "applications" && <AppliedTenders />}
        {activeTab === "calendar" && <DeadlineCalendar />}
        {activeTab === "notifications" && <NotificationSettings />}
      </div>
    </div>
  );
}

/* ─── Overview Tab ─────────────────────────────── */

function OverviewTab() {
  const { followedTenderIds, applications } = useUserStore();

  const followedTenders = useMemo(
    () => tenders.filter((t) => followedTenderIds.includes(t.id)),
    [followedTenderIds]
  );

  const upcomingDeadlines = useMemo(() => {
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    return followedTenders
      .filter(
        (t) =>
          t.status === "active" &&
          new Date(t.deadline).getTime() - now > 0 &&
          new Date(t.deadline).getTime() - now <= sevenDays
      )
      .sort(
        (a, b) =>
          new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
      );
  }, [followedTenders]);

  const recentApplications = useMemo(
    () =>
      [...applications]
        .sort(
          (a, b) =>
            new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()
        )
        .slice(0, 5),
    [applications]
  );

  return (
    <div className="space-y-6">
      <SummaryCards />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming deadlines */}
        <section className="bg-white rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Clock size={18} className="text-secondary" />
              Yaklaşan Son Tarihler (7 Gün)
            </h2>
            <span className="text-xs text-foreground-light bg-secondary/10 text-secondary px-2 py-0.5 rounded-full font-medium">
              {upcomingDeadlines.length} ihale
            </span>
          </div>

          {upcomingDeadlines.length > 0 ? (
            <ul className="space-y-3">
              {upcomingDeadlines.map((tender) => {
                const daysLeft = Math.ceil(
                  (new Date(tender.deadline).getTime() - Date.now()) /
                    (1000 * 60 * 60 * 24)
                );
                return (
                  <li key={tender.id}>
                    <Link
                      href={`/ihaleler/${tender.id}`}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-background-alt transition-colors group"
                    >
                      <div
                        className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                          daysLeft <= 2
                            ? "bg-red-100 text-red-700"
                            : daysLeft <= 5
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-green-100 text-green-700"
                        }`}
                      >
                        {daysLeft}g
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground group-hover:text-primary truncate transition-colors">
                          {tender.title}
                        </p>
                        <p className="text-xs text-foreground-light">
                          Son:{" "}
                          {new Date(tender.deadline).toLocaleDateString(
                            "tr-TR"
                          )}{" "}
                          · {tender.institution}
                        </p>
                      </div>
                      <ChevronRight
                        size={16}
                        className="text-foreground-light shrink-0 mt-1"
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState
              icon={Clock}
              message="Yaklaşan son tarih bulunmuyor"
              sub="Takip ettiğiniz ihalelerin yaklaşan son başvuru tarihleri burada görünecek."
            />
          )}
        </section>

        {/* Recent applications */}
        <section className="bg-white rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <FileCheck size={18} className="text-primary" />
              Son Başvurular
            </h2>
            <span className="text-xs text-foreground-light bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
              {applications.length} toplam
            </span>
          </div>

          {recentApplications.length > 0 ? (
            <ul className="space-y-3">
              {recentApplications.map((app) => {
                const tender = tenders.find((t) => t.id === app.tenderId);
                if (!tender) return null;
                return (
                  <li key={app.tenderId}>
                    <Link
                      href={`/ihaleler/${tender.id}`}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-background-alt transition-colors group"
                    >
                      <ApplicationStatusBadge status={app.status} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground group-hover:text-primary truncate transition-colors">
                          {tender.title}
                        </p>
                        <p className="text-xs text-foreground-light">
                          Başvuru:{" "}
                          {new Date(app.appliedAt).toLocaleDateString(
                            "tr-TR"
                          )}
                        </p>
                      </div>
                      <ChevronRight
                        size={16}
                        className="text-foreground-light shrink-0 mt-1"
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState
              icon={FileCheck}
              message="Henüz başvuru yapılmadı"
              sub="İhalelere başvurduğunuzda burada görünecek."
            />
          )}
        </section>
      </div>

      {/* Quick actions */}
      <section className="bg-white rounded-xl border border-border p-5">
        <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
          <TrendingUp size={18} className="text-accent" />
          Hızlı Erişim
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            href="/ihaleler"
            className="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors group"
          >
            <PlusCircle
              size={20}
              className="text-primary group-hover:scale-110 transition-transform"
            />
            <div>
              <p className="text-sm font-medium text-foreground">
                Yeni İhale Bul
              </p>
              <p className="text-xs text-foreground-light">
                Gelişmiş arama ile ihale ara
              </p>
            </div>
          </Link>
          <Link
            href="/ihaleler"
            className="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-secondary/30 hover:bg-secondary/5 transition-colors group"
          >
            <Star
              size={20}
              className="text-secondary group-hover:scale-110 transition-transform"
            />
            <div>
              <p className="text-sm font-medium text-foreground">
                Önerilen İhaleler
              </p>
              <p className="text-xs text-foreground-light">
                Size uygun ihaleler
              </p>
            </div>
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-accent/30 hover:bg-accent/5 transition-colors group"
          >
            <Settings
              size={20}
              className="text-accent group-hover:scale-110 transition-transform"
            />
            <div>
              <p className="text-sm font-medium text-foreground">
                Bildirim Ayarları
              </p>
              <p className="text-xs text-foreground-light">
                E-posta ve SMS tercihleri
              </p>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}

/* ─── Shared Components ─────────────────────── */

export function ApplicationStatusBadge({
  status,
}: {
  status: "pending" | "won" | "lost";
}) {
  const map = {
    pending: {
      bg: "bg-yellow-100 text-yellow-700",
      label: "Beklemede",
    },
    won: { bg: "bg-green-100 text-green-700", label: "Kazandı" },
    lost: { bg: "bg-red-100 text-red-700", label: "Kaybetti" },
  };
  const { bg, label } = map[status];
  return (
    <span
      className={`flex-shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${bg}`}
    >
      {label}
    </span>
  );
}

export function EmptyState({
  icon: Icon,
  message,
  sub,
}: {
  icon: React.ElementType;
  message: string;
  sub: string;
}) {
  return (
    <div className="text-center py-8">
      <Icon size={36} className="mx-auto text-foreground-light/40 mb-3" />
      <p className="text-sm font-medium text-foreground-light">{message}</p>
      <p className="text-xs text-foreground-light/70 mt-1">{sub}</p>
    </div>
  );
}
