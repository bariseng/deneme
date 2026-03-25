import type { Metadata } from "next";
import AIFeaturesClient from "./AIFeaturesClient";

export const metadata: Metadata = {
  title: "AI Özellikleri",
  description:
    "Yapay zeka destekli ihale analiz araçları: eşleştirme, fiyat tahmini, trend analizi.",
};

export default function AIPage() {
  return <AIFeaturesClient />;
}
