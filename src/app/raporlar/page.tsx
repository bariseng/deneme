import type { Metadata } from "next";
import ReportsClient from "./ReportsClient";

export const metadata: Metadata = {
  title: "Raporlar",
  description: "İhalePro raporlama ve analitik dashboard.",
};

export default function ReportsPage() {
  return <ReportsClient />;
}
