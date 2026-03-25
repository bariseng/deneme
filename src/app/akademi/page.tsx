import { Metadata } from "next";
import AkademiClient from "./AkademiClient";

export const metadata: Metadata = {
  title: "İhale Akademisi | İhalePro",
  description: "İhale mevzuatı, EKAP, teklif hazırlama eğitimleri ve sertifika programları",
};

export default function AkademiPage() {
  return <AkademiClient />;
}
