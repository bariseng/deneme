import { Metadata } from "next";
import MarketIntelligenceClient from "./MarketIntelligenceClient";

export const metadata: Metadata = {
  title: "Pazar İstihbaratı",
  description: "Sektör trend raporu, kurum harcama analizi, fiyat endeksi, rekabet yoğunluğu",
};

export default function MarketIntelligencePage() {
  return <MarketIntelligenceClient />;
}
