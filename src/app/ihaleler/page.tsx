import type { Metadata } from "next";
import TenderListClient from "./TenderListClient";

export const metadata: Metadata = {
  title: "İhale Listesi",
  description:
    "Türkiye genelindeki güncel kamu ve özel sektör ihalelerini listeleyin, filtreleyin ve takip edin.",
  openGraph: {
    title: "İhale Listesi | İhalePro",
    description: "Güncel ihale ilanlarını keşfedin.",
  },
};

export default function TenderListPage() {
  return <TenderListClient />;
}
