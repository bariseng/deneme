"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Loader2,
  BookOpen,
} from "lucide-react";
import LessonSidebar from "@/components/academy/LessonSidebar";
import QuizComponent from "@/components/academy/QuizComponent";

interface QuizData {
  id: string;
  lessonId: string;
  questions: Array<{
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }>;
  passingScore: number;
}

interface LessonData {
  id: string;
  title: string;
  slug: string;
  content: string;
  videoUrl: string | null;
  durationMinutes: number;
  order: number;
  quiz: QuizData | null;
  course: { id: string; title: string; slug: string };
}

interface CourseLessons {
  id: string;
  title: string;
  slug: string;
  lessons: Array<{
    id: string;
    title: string;
    slug: string;
    durationMinutes: number;
    quiz?: { id: string } | null;
  }>;
}

export default function LessonPageClient() {
  const params = useParams();
  const courseSlug = params.slug as string;
  const lessonSlug = params.lessonSlug as string;

  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [courseLessons, setCourseLessons] = useState<CourseLessons | null>(null);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [isCurrentCompleted, setIsCurrentCompleted] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [lessonRes, courseRes, progressRes] = await Promise.all([
        fetch(`/api/academy/courses/${courseSlug}/lessons/${lessonSlug}`),
        fetch(`/api/academy/courses/${courseSlug}`),
        fetch("/api/academy/progress").catch(() => null),
      ]);

      if (lessonRes.ok) {
        const l = await lessonRes.json();
        setLesson(l);
      }
      if (courseRes.ok) {
        const c = await courseRes.json();
        setCourseLessons(c);

        if (progressRes?.ok) {
          const data = await progressRes.json();
          const p = data.progress?.find((p: { courseId: string }) => p.courseId === c.id);
          if (p) {
            setCompletedIds(p.completedLessons || []);
          }
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [courseSlug, lessonSlug]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (lesson) {
      setIsCurrentCompleted(completedIds.includes(lesson.id));
    }
  }, [lesson, completedIds]);

  const handleComplete = async () => {
    if (!lesson || isCurrentCompleted) return;
    setCompleting(true);
    try {
      const res = await fetch(`/api/academy/courses/${courseSlug}/lessons/${lessonSlug}/complete`, {
        method: "POST",
      });
      if (res.ok) {
        const result = await res.json();
        setIsCurrentCompleted(true);
        setCompletedIds((prev) => [...prev, lesson.id]);

        if (result.completed && result.certificate) {
          alert(`Tebrikler! Kursu tamamladınız! Sertifika No: ${result.certificate.certificateNumber}`);
        }
      }
    } catch {
      // ignore
    } finally {
      setCompleting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Yükleniyor...</div>;
  if (!lesson || !courseLessons) return <div className="min-h-screen flex items-center justify-center text-gray-500">Ders bulunamadı</div>;

  const currentIndex = courseLessons.lessons.findIndex((l) => l.slug === lessonSlug);
  const prevLesson = currentIndex > 0 ? courseLessons.lessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < courseLessons.lessons.length - 1 ? courseLessons.lessons[currentIndex + 1] : null;

  // Markdown'u basit HTML'e çevir
  const contentHtml = lesson.content
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold text-gray-900 mt-6 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-gray-900 mt-8 mb-3">$1</h2>')
    .replace(/^\*\*(.+?)\*\*/gm, '<strong>$1</strong>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 text-gray-700">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 text-gray-700"><strong>$1.</strong> $2</li>')
    .replace(/\n\n/g, '<br/><br/>');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href={`/akademi/${courseSlug}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft size={16} />
          {courseLessons.title}
        </Link>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="lg:w-72 shrink-0 order-2 lg:order-1">
            <LessonSidebar
              courseSlug={courseSlug}
              lessons={courseLessons.lessons}
              currentLessonSlug={lessonSlug}
              completedLessonIds={completedIds}
            />
          </div>

          {/* Main Content */}
          <div className="flex-1 order-1 lg:order-2">
            {/* Video */}
            {lesson.videoUrl && (
              <div className="bg-black rounded-xl overflow-hidden mb-6 aspect-video">
                {lesson.videoUrl.includes("youtube") || lesson.videoUrl.includes("youtu.be") ? (
                  <iframe
                    src={lesson.videoUrl.replace("watch?v=", "embed/")}
                    className="w-full h-full"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                ) : (
                  <video src={lesson.videoUrl} controls className="w-full h-full" />
                )}
              </div>
            )}

            {/* Lesson Content */}
            <div className="bg-white rounded-xl border p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <BookOpen size={22} className="text-blue-600" />
                  {lesson.title}
                </h1>
                {isCurrentCompleted && (
                  <span className="flex items-center gap-1 text-sm text-green-600 font-medium">
                    <CheckCircle size={16} /> Tamamlandı
                  </span>
                )}
              </div>

              <div
                className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: contentHtml }}
              />

              {/* Complete Button */}
              {!isCurrentCompleted && (
                <div className="mt-8 pt-6 border-t">
                  <button
                    onClick={handleComplete}
                    disabled={completing}
                    className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
                  >
                    {completing ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                    {completing ? "İşleniyor..." : "Dersi Tamamla"}
                  </button>
                </div>
              )}
            </div>

            {/* Quiz */}
            {lesson.quiz && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Quiz</h2>
                <QuizComponent
                  quizId={lesson.quiz.id}
                  lessonId={lesson.id}
                  questions={lesson.quiz.questions}
                  passingScore={lesson.quiz.passingScore}
                />
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between">
              {prevLesson ? (
                <Link
                  href={`/akademi/${courseSlug}/${prevLesson.slug}`}
                  className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 border rounded-lg px-4 py-2"
                >
                  <ArrowLeft size={16} />
                  Önceki Ders
                </Link>
              ) : <div />}
              {nextLesson ? (
                <Link
                  href={`/akademi/${courseSlug}/${nextLesson.slug}`}
                  className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg px-4 py-2"
                >
                  Sonraki Ders
                  <ArrowRight size={16} />
                </Link>
              ) : (
                <Link
                  href={`/akademi/${courseSlug}`}
                  className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg px-4 py-2"
                >
                  Kursa Dön
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
