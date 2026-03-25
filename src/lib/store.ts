"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/* ── Types ─────────────────────────────────────── */

export type ApplicationStatus = "pending" | "won" | "lost";

export interface TenderApplication {
  tenderId: string;
  appliedAt: string; // ISO date
  status: ApplicationStatus;
  note?: string;
}

export interface NotificationPreferences {
  emailNewTender: boolean;
  emailDeadlineReminder: boolean;
  emailApplicationUpdate: boolean;
  emailAmendment: boolean;
  emailCancellation: boolean;
  smsDeadlineReminder: boolean;
  smsApplicationUpdate: boolean;
  reminderDaysBefore: number; // 1, 3, 7
}

/* ── Notification types ─────────────────────────── */

export type NotificationType =
  | "new_tender"
  | "deadline_reminder"
  | "amendment"
  | "cancellation"
  | "application_update"
  | "rule_match";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  tenderId?: string;
  read: boolean;
  createdAt: string; // ISO date
}

/* ── Notification rules ─────────────────────────── */

export interface NotificationRule {
  id: string;
  name: string;
  enabled: boolean;
  city?: string;
  category?: string;
  institutionType?: string;
  minBudget?: number;
  maxBudget?: number;
}

/* ── Store Interface ────────────────────────────── */

interface UserStore {
  /* Followed tenders */
  followedTenderIds: string[];
  toggleFollow: (tenderId: string) => void;
  isFollowed: (tenderId: string) => boolean;

  /* Applications */
  applications: TenderApplication[];
  addApplication: (tenderId: string) => void;
  updateApplicationStatus: (
    tenderId: string,
    status: ApplicationStatus
  ) => void;
  removeApplication: (tenderId: string) => void;
  getApplication: (tenderId: string) => TenderApplication | undefined;

  /* Notification preferences */
  notificationPrefs: NotificationPreferences;
  updateNotificationPrefs: (
    prefs: Partial<NotificationPreferences>
  ) => void;

  /* In-app notifications */
  notifications: AppNotification[];
  addNotification: (n: Omit<AppNotification, "id" | "createdAt" | "read">) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAllNotifications: () => void;
  unreadCount: () => number;

  /* Notification rules */
  notificationRules: NotificationRule[];
  addRule: (rule: Omit<NotificationRule, "id">) => void;
  updateRule: (id: string, updates: Partial<NotificationRule>) => void;
  deleteRule: (id: string) => void;
  toggleRuleEnabled: (id: string) => void;
}

/* ── Seed notifications ────────────────────────── */

let _nextId = 100;
function genId() {
  return `notif-${++_nextId}-${Date.now()}`;
}

const seedNotifications: AppNotification[] = [
  {
    id: "notif-1",
    type: "new_tender",
    title: "Yeni İhale: Ankara-Sivas YHT Hattı",
    message:
      "Takip ettiğiniz kategoride yeni bir ihale yayınlandı. Tahmini bedel: 2.450.000.000 ₺",
    tenderId: "1",
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min ago
  },
  {
    id: "notif-2",
    type: "deadline_reminder",
    title: "Son Başvuru Yaklaşıyor: Tıbbi Cihaz Alımı",
    message:
      "Sağlık Bakanlığı Tıbbi Cihaz Alımı ihalesinin son başvuru tarihi 3 gün sonra.",
    tenderId: "3",
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2h ago
  },
  {
    id: "notif-3",
    type: "amendment",
    title: "Zeyilname: İstanbul Havalimanı Projesi",
    message:
      "İstanbul Havalimanı Terminal Genişletme Projesi ihalesinde zeyilname yayınlandı. Son başvuru tarihi güncellendi.",
    tenderId: "2",
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5h ago
  },
  {
    id: "notif-4",
    type: "cancellation",
    title: "İhale İptal: DSİ Baraj Danışmanlık",
    message:
      "DSİ Baraj İnşaatı Danışmanlık Hizmeti ihalesi iptal edilmiştir.",
    tenderId: "7",
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
  },
  {
    id: "notif-5",
    type: "application_update",
    title: "Başvuru Güncelleme",
    message:
      "Karayolları Asfalt Yapım İşi başvurunuz inceleme aşamasındadır.",
    tenderId: "6",
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
  },
  {
    id: "notif-6",
    type: "rule_match",
    title: "Kural Eşleşmesi: İstanbul + Yapım + >100M ₺",
    message:
      "Bildirim kuralınıza uyan yeni bir ihale bulundu: İstanbul Havalimanı Terminal Genişletme Projesi",
    tenderId: "2",
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), // 3 days ago
  },
];

const seedRules: NotificationRule[] = [
  {
    id: "rule-1",
    name: "İstanbul Yapım İhaleleri",
    enabled: true,
    city: "İstanbul",
    category: "Yapım İşleri",
    minBudget: 100000000,
  },
  {
    id: "rule-2",
    name: "Ankara Bilişim İhaleleri",
    enabled: true,
    city: "Ankara",
    category: "Bilişim",
    minBudget: 10000000,
  },
];

/* ── Store ─────────────────────────────────────── */

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      /* ── Followed tenders ── */
      followedTenderIds: [],

      toggleFollow: (tenderId) =>
        set((state) => {
          const exists = state.followedTenderIds.includes(tenderId);
          return {
            followedTenderIds: exists
              ? state.followedTenderIds.filter((id) => id !== tenderId)
              : [...state.followedTenderIds, tenderId],
          };
        }),

      isFollowed: (tenderId) =>
        get().followedTenderIds.includes(tenderId),

      /* ── Applications ── */
      applications: [],

      addApplication: (tenderId) =>
        set((state) => {
          if (state.applications.some((a) => a.tenderId === tenderId))
            return state;
          return {
            applications: [
              ...state.applications,
              {
                tenderId,
                appliedAt: new Date().toISOString(),
                status: "pending" as ApplicationStatus,
              },
            ],
          };
        }),

      updateApplicationStatus: (tenderId, status) =>
        set((state) => ({
          applications: state.applications.map((a) =>
            a.tenderId === tenderId ? { ...a, status } : a
          ),
        })),

      removeApplication: (tenderId) =>
        set((state) => ({
          applications: state.applications.filter(
            (a) => a.tenderId !== tenderId
          ),
        })),

      getApplication: (tenderId) =>
        get().applications.find((a) => a.tenderId === tenderId),

      /* ── Notification preferences ── */
      notificationPrefs: {
        emailNewTender: true,
        emailDeadlineReminder: true,
        emailApplicationUpdate: true,
        emailAmendment: true,
        emailCancellation: true,
        smsDeadlineReminder: false,
        smsApplicationUpdate: false,
        reminderDaysBefore: 3,
      },

      updateNotificationPrefs: (prefs) =>
        set((state) => ({
          notificationPrefs: { ...state.notificationPrefs, ...prefs },
        })),

      /* ── In-app notifications ── */
      notifications: seedNotifications,

      addNotification: (n) =>
        set((state) => ({
          notifications: [
            {
              ...n,
              id: genId(),
              read: false,
              createdAt: new Date().toISOString(),
            },
            ...state.notifications,
          ],
        })),

      markAsRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),

      markAllAsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({
            ...n,
            read: true,
          })),
        })),

      deleteNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),

      clearAllNotifications: () => set({ notifications: [] }),

      unreadCount: () =>
        get().notifications.filter((n) => !n.read).length,

      /* ── Notification rules ── */
      notificationRules: seedRules,

      addRule: (rule) =>
        set((state) => ({
          notificationRules: [
            ...state.notificationRules,
            { ...rule, id: `rule-${Date.now()}` },
          ],
        })),

      updateRule: (id, updates) =>
        set((state) => ({
          notificationRules: state.notificationRules.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
        })),

      deleteRule: (id) =>
        set((state) => ({
          notificationRules: state.notificationRules.filter(
            (r) => r.id !== id
          ),
        })),

      toggleRuleEnabled: (id) =>
        set((state) => ({
          notificationRules: state.notificationRules.map((r) =>
            r.id === id ? { ...r, enabled: !r.enabled } : r
          ),
        })),
    }),
    {
      name: "ihalepro-user-store",
    }
  )
);
