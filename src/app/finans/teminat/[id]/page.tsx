import { Metadata } from "next";
import TeminatDetailClient from "./TeminatDetailClient";

export const metadata: Metadata = {
  title: "Teminat Teklifleri Karşılaştırma | İhalePro",
  description: "Banka teminat mektubu tekliflerini karşılaştırın",
};

export default function TeminatDetailPage() {
  return <TeminatDetailClient />;
}
