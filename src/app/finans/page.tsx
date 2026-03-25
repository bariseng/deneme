import { Metadata } from "next";
import FinansClient from "./FinansClient";

export const metadata: Metadata = {
  title: "Teminat Mektubu & Sigorta Marketplace | İhalePro",
  description: "İhale teminat mektubu ve sigorta tekliflerini karşılaştırın",
};

export default function FinansPage() {
  return <FinansClient />;
}
