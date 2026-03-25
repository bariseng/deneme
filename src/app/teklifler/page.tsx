import type { Metadata } from "next";
import BidListClient from "./BidListClient";

export const metadata: Metadata = {
  title: "Teklif Hazırlama",
  description:
    "İhaleler için teklif oluşturun, maliyet hesaplayın ve teklif mektubunuzu hazırlayın.",
};

export default function TekliflerPage() {
  return <BidListClient />;
}
