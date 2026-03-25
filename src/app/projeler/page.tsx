import { Metadata } from "next";
import ProjectsClient from "./ProjectsClient";

export const metadata: Metadata = {
  title: "Proje Yönetimi",
  description: "İhalelerinizi proje olarak yönetin — Kanban, Gantt, görev atama",
};

export default function ProjectsPage() {
  return <ProjectsClient />;
}
