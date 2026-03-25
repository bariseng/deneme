import type { Metadata } from "next";
import DashboardClient from "./DashboardClient";

export const metadata: Metadata = {
  title: "Kontrol Paneli",
  description:
    "İhalePro kontrol paneli - takip ettiğiniz ihaleler, başvurularınız ve yaklaşan son başvuru tarihleri.",
};

export default function DashboardPage() {
  return <DashboardClient />;
}
