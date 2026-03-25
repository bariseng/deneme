import type { Metadata } from "next";
import NotificationHistoryClient from "./NotificationHistoryClient";

export const metadata: Metadata = {
  title: "Bildirimler",
  description: "İhalePro bildirim geçmişi ve bildirim kuralları yönetimi.",
};

export default function NotificationHistoryPage() {
  return <NotificationHistoryClient />;
}
