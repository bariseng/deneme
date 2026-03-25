import { Metadata } from "next";
import CourseDetailClient from "./CourseDetailClient";

export const metadata: Metadata = {
  title: "Kurs Detay | İhale Akademisi",
  description: "İhale eğitim kursu detayı ve ders listesi",
};

export default function CourseDetailPage() {
  return <CourseDetailClient />;
}
