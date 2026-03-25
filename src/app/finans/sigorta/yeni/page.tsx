import { Metadata } from "next";
import SigortaFormClient from "./SigortaFormClient";

export const metadata: Metadata = {
  title: "Sigorta Talebi | İhalePro",
  description: "İhale sigortası talebi oluşturun",
};

export default function SigortaYeniPage() {
  return <SigortaFormClient />;
}
