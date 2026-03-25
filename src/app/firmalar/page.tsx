import type { Metadata } from "next";
import CompanyListClient from "./CompanyListClient";

export const metadata: Metadata = {
  title: "Rakip Analizi - Firma Arama",
  description:
    "Firma arama ve rakip analizi. İhale geçmişi, sektörel pazar payı ve karşılaştırma.",
};

export default function CompanyListPage() {
  return <CompanyListClient />;
}
