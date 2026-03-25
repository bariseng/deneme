import type { Metadata } from "next";
import PremiumClient from "./PremiumClient";

export const metadata: Metadata = {
  title: "Premium Üyelik",
  description:
    "İhalePro premium üyelik planları. Yapay zeka, sınırsız bildirim ve rakip takibi.",
};

export default function PremiumPage() {
  return <PremiumClient />;
}
