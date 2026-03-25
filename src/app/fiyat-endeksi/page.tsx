import { Metadata } from "next";
import FiyatEndeksiClient from "./FiyatEndeksiClient";

export const metadata: Metadata = {
  title: "İhale Fiyat Endeksi | İhalePro",
  description: "İhale birim fiyatları, sektörel trendler ve bölgesel karşılaştırmalar",
};

export default function FiyatEndeksiPage() {
  return <FiyatEndeksiClient />;
}
