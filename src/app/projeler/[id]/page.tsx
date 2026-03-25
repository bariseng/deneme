import { Metadata } from "next";
import ProjectDetailClient from "./ProjectDetailClient";

export const metadata: Metadata = {
  title: "Proje Detayı",
  description: "İhale proje yönetimi — görevler, timeline, yorumlar",
};

export default function ProjectDetailPage() {
  return <ProjectDetailClient />;
}
