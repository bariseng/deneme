import type { Metadata } from "next";
import APIDocsClient from "./APIDocsClient";

export const metadata: Metadata = {
  title: "API Dokümantasyonu",
  description: "İhalePro RESTful API dokümantasyonu ve entegrasyon rehberi.",
};

export default function APIDocsPage() {
  return <APIDocsClient />;
}
