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
  smsDeadlineReminder: boolean;
  smsApplicationUpdate: boolean;
  reminderDaysBefore: number; // 1, 3, 7
}

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
}

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
        smsDeadlineReminder: false,
        smsApplicationUpdate: false,
        reminderDaysBefore: 3,
      },

      updateNotificationPrefs: (prefs) =>
        set((state) => ({
          notificationPrefs: { ...state.notificationPrefs, ...prefs },
        })),
    }),
    {
      name: "ihalepro-user-store",
    }
  )
);
