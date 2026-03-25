import type { Metadata } from "next";
import AdminDashboardClient from "./AdminDashboardClient";

export const metadata: Metadata = {
  title: "Raporlama & Analitik",
  description:
    "İhale istatistikleri, kullanıcı aktiviteleri ve dönem karşılaştırmaları.",
};

export default function AdminPage() {
  return <AdminDashboardClient />;
}
