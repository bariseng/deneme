import type { Metadata } from "next";
import IntegrationsClient from "./IntegrationsClient";

export const metadata: Metadata = {
  title: "Entegrasyonlar",
  description: "İhalePro dış servis entegrasyonları ve durumları.",
};

export default function IntegrationsPage() {
  return <IntegrationsClient />;
}
