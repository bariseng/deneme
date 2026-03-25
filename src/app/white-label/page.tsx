import { Metadata } from "next";
import WhiteLabelClient from "./WhiteLabelClient";

export const metadata: Metadata = {
  title: "White-Label & API Marketplace",
  description: "Tenant yönetimi, API anahtarları, webhook sistemi, partner programı",
};

export default function WhiteLabelPage() {
  return <WhiteLabelClient />;
}
