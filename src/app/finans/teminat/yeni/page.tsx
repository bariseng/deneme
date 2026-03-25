import { Metadata } from "next";
import TeminatFormClient from "./TeminatFormClient";

export const metadata: Metadata = {
  title: "Teminat Mektubu Talebi | İhalePro",
  description: "İhale teminat mektubu talebi oluşturun",
};

export default function TeminatYeniPage() {
  return <TeminatFormClient />;
}
