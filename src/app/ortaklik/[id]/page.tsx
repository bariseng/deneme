import { Metadata } from "next";
import OrtaklikDetailClient from "./OrtaklikDetailClient";

export const metadata: Metadata = {
  title: "İş Ortaklığı Detay | İhalePro",
  description: "İş ortaklığı ilanı detayı ve eşleşen firmalar",
};

export default function OrtaklikDetailPage() {
  return <OrtaklikDetailClient />;
}
