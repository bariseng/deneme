"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Users,
  Lock,
  PlayCircle,
  CheckCircle,
  FileQuestion,
  GraduationCap,
  Award,
} from "lucide-react";
import ProgressRing from "@/components/academy/ProgressRing";

interface Lesson {
  id: string;
  title: string;
  slug: string;
  durationMinutes: number;
  order: number;
  quiz?: { id: string; passingScore: number } | null;
}

interface CourseDetail {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  difficulty: string;
  durationMinutes: number;
  isPremium: boolean;
  price: string | null;
  instructorName: string | null;
  lessons: Lesson[];
  _count: { progress: number; certificates: number };
}

interface Progress {
  completedLessons: string[];
  quizScores: Record<string, number> | null;
  completedAt: string | null;
  certificateId: string | null;
}

const DIFF_MAP: Record<string, { label: string; color: string }> = {
  BASLANGIC: { label: "Başlangıç", color: "bg-green-100 text-green-800" },
  ORTA: { label: "Orta", color: "bg-blue-100 text-blue-800" },
  ILERI: { label: "İleri", color: "bg-orange-100 text-orange-800" },
  UZMAN: { label: "Uzman", color: "bg-red-100 text-red-800" },
};

const CAT_MAP: Record<string, string> = {
  MEVZUAT: "Mevzuat",
  EKAP: "EKAP",
  TEKLIF: "Teklif Hazırlama",
  SOZLESME: "Sözleşme",
  FINANS: "Finans",
};

export default function CourseDetailClient() {
  const params = useParams();
  const slug = params.slug as string;

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [courseRes, progressRes] = await Promise.all([
        fetch(`/api/academy/courses/${slug}`),
        fetch("/api/academy/progress").catch(() => null),
      ]);

      if (courseRes.ok) {
        const c = await courseRes.json();
        setCourse(c);

        if (progressRes?.ok) {
          const data = await progressRes.json();
          const p = data.progress?.find((p: { courseId: string }) => p.courseId === c.id);
          if (p) setProgress(p);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Yükleniyor...</div>;
  if (!course) return <div className="min-h-screen flex items-center justify-center text-gray-500">Kurs bulunamadı</div>;

  const diff = DIFF_MAP[course.difficulty] || DIFF_MAP.BASLANGIC;
  const completedIds = progress?.completedLessons || [];
  const totalLessons = course.lessons.length;
  const completedCount = completedIds.length;
  const percent = totalLessons > 0 ? (completedCount / totalLessons) * 100 : 0;
  const isCompleted = !!progress?.completedAt;

  // İlk tamamlanmamış ders
  const nextLesson = course.lessons.find((l) => !completedIds.includes(l.id));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/akademi" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft size={16} />
          Akademi
        </Link>

        {/* Course Header */}
        <div className="bg-white rounded-xl border p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                  {CAT_MAP[course.category] || course.category}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${diff.color}`}>
                  {diff.label}
                </span>
                {course.isPremium && (
                  <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-xs font-medium flex items-center gap-0.5">
                    <Lock size={10} /> Premium
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{course.title}</h1>
              <p className="text-gray-600 mb-4">{course.description}</p>

              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1"><Clock size={14} /> {course.durationMinutes} dakika</span>
                <span className="flex items-center gap-1"><BookOpen size={14} /> {totalLessons} ders</span>
                <span className="flex items-center gap-1"><Users size={14} /> {course._count.progress} öğrenci</span>
                <span className="flex items-center gap-1"><Award size={14} /> {course._count.certificates} sertifika</span>
                {course.instructorName && (
                  <span className="flex items-center gap-1"><GraduationCap size={14} /> {course.instructorName}</span>
                )}
              </div>

              {/* CTA */}
              <div className="mt-6">
                {isCompleted ? (
                  <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-6 py-3 rounded-lg font-medium">
                    <CheckCircle size={20} />
                    Kurs Tamamlandı!
                  </div>
                ) : nextLesson ? (
                  <Link
                    href={`/akademi/${course.slug}/${nextLesson.slug}`}
                    className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
                  >
                    <PlayCircle size={20} />
                    {completedCount > 0 ? "Devam Et" : "Kursa Başla"}
                  </Link>
                ) : null}
              </div>
            </div>

            {/* Progress */}
            {completedCount > 0 && (
              <div className="flex flex-col items-center justify-center lg:w-48">
                <ProgressRing percent={percent} size={100} strokeWidth={8} />
                <p className="text-sm text-gray-500 mt-2">{completedCount}/{totalLessons} ders</p>
              </div>
            )}
          </div>
        </div>

        {/* Lesson List */}
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Müfredat</h2>
        <div className="bg-white rounded-xl border overflow-hidden">
          {course.lessons.map((lesson, i) => {
            const isLessonCompleted = completedIds.includes(lesson.id);
            const quizScore = progress?.quizScores?.[lesson.id];

            return (
              <Link
                key={lesson.id}
                href={`/akademi/${course.slug}/${lesson.slug}`}
                className="flex items-center gap-4 p-4 border-b last:border-b-0 hover:bg-gray-50 transition-colors"
              >
                <div className="shrink-0">
                  {isLessonCompleted ? (
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle size={20} className="text-green-600" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-500">
                      {i + 1}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium ${isLessonCompleted ? "text-green-700" : "text-gray-900"}`}>
                    {lesson.title}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                    <span>{lesson.durationMinutes} dk</span>
                    {lesson.quiz && (
                      <span className="flex items-center gap-0.5 text-purple-500">
                        <FileQuestion size={10} /> Quiz
                        {quizScore !== undefined && ` (${quizScore}%)`}
                      </span>
                    )}
                  </div>
                </div>
                <PlayCircle size={20} className="text-gray-300 shrink-0" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
