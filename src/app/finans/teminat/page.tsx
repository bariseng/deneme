import { Metadata } from "next";
import TeminatListClient from "./TeminatListClient";

export const metadata: Metadata = {
  title: "Teminat Mektubu Talepleri | İhalePro",
  description: "Teminat mektubu taleplerini listeleyin ve teklifleri karşılaştırın",
};

export default function TeminatListPage() {
  return <TeminatListClient />;
}
