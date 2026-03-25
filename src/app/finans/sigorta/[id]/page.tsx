import { Metadata } from "next";
import SigortaDetailClient from "./SigortaDetailClient";

export const metadata: Metadata = {
  title: "Sigorta Teklifleri Karşılaştırma | İhalePro",
  description: "Sigorta tekliflerini karşılaştırın",
};

export default function SigortaDetailPage() {
  return <SigortaDetailClient />;
}
