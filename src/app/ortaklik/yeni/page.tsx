import { Metadata } from "next";
import YeniOrtaklikClient from "./YeniOrtaklikClient";

export const metadata: Metadata = {
  title: "İş Ortaklığı İlanı Oluştur | İhalePro",
  description: "İhale için iş ortaklığı (JV) partner arayışı ilanı oluşturun",
};

export default function YeniOrtaklikPage() {
  return <YeniOrtaklikClient />;
}
