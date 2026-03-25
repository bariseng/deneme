import { Metadata } from "next";
import SigortaListClient from "./SigortaListClient";

export const metadata: Metadata = {
  title: "Sigorta Talepleri | İhalePro",
  description: "Sigorta taleplerini listeleyin ve teklifleri karşılaştırın",
};

export default function SigortaListPage() {
  return <SigortaListClient />;
}
