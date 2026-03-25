import { Metadata } from "next";
import WikiDetailClient from "./WikiDetailClient";

export const metadata: Metadata = {
  title: "Wiki Makalesi",
  description: "İhale bilgi bankası makalesi",
};

export default function WikiDetailPage() {
  return <WikiDetailClient />;
}
