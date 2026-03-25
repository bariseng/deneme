import type { Metadata } from "next";
import AgentDashboardClient from "./AgentDashboardClient";

export const metadata: Metadata = {
  title: "İhale Avcısı — Agentic AI",
  description: "Otonom ihale eşleştirme, SWOT analizi ve teklif taslağı",
};

export default function AgentDashboardPage() {
  return <AgentDashboardClient />;
}
