import { Metadata } from "next";
import DocumentsClient from "./DocumentsClient";

export const metadata: Metadata = {
  title: "Belge Yönetimi",
  description: "E-imza, doküman versiyonlama, onay workflow ve güvenli paylaşım",
};

export default function DocumentsPage() {
  return <DocumentsClient />;
}
