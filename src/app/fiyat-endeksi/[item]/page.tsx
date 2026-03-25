import { Metadata } from "next";
import ItemDetailClient from "./ItemDetailClient";

export const metadata: Metadata = {
  title: "Fiyat Detay | İhale Fiyat Endeksi",
  description: "Birim fiyat detayı, tüm şehirler ve trend analizi",
};

export default function ItemDetailPage() {
  return <ItemDetailClient />;
}
