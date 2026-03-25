import { Metadata } from "next";
import SertifikaDogrulamaClient from "./SertifikaDogrulamaClient";

export const metadata: Metadata = {
  title: "Sertifika Doğrulama | İhalePro",
  description: "İhalePro Akademi sertifika doğrulama sayfası",
};

export default function SertifikaDogrulamaPage() {
  return <SertifikaDogrulamaClient />;
}
