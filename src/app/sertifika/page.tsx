import { Metadata } from "next";
import SertifikaSearchClient from "./SertifikaSearchClient";

export const metadata: Metadata = {
  title: "Sertifika Doğrulama | İhalePro",
  description: "İhalePro Akademi sertifika doğrulama ve arama sayfası",
};

export default function SertifikaPage() {
  return <SertifikaSearchClient />;
}
