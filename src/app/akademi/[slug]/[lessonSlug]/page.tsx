import { Metadata } from "next";
import LessonPageClient from "./LessonPageClient";

export const metadata: Metadata = {
  title: "Ders | İhale Akademisi",
  description: "İhale eğitim dersi",
};

export default function LessonPage() {
  return <LessonPageClient />;
}
