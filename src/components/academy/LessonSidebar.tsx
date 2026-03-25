"use client";

import Link from "next/link";
import { CheckCircle, Circle, PlayCircle, FileQuestion } from "lucide-react";

interface Lesson {
  id: string;
  title: string;
  slug: string;
  durationMinutes: number;
  quiz?: { id: string } | null;
}

interface LessonSidebarProps {
  courseSlug: string;
  lessons: Lesson[];
  currentLessonSlug: string;
  completedLessonIds: string[];
}

export default function LessonSidebar({
  courseSlug,
  lessons,
  currentLessonSlug,
  completedLessonIds,
}: LessonSidebarProps) {
  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="p-4 border-b bg-gray-50">
        <h3 className="font-semibold text-gray-900 text-sm">Dersler</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          {completedLessonIds.length}/{lessons.length} tamamlandı
        </p>
      </div>
      <div className="divide-y">
        {lessons.map((lesson, i) => {
          const isActive = lesson.slug === currentLessonSlug;
          const isCompleted = completedLessonIds.includes(lesson.id);

          return (
            <Link
              key={lesson.id}
              href={`/akademi/${courseSlug}/${lesson.slug}`}
              className={`flex items-center gap-3 p-3 text-sm transition-colors ${
                isActive
                  ? "bg-blue-50 border-l-2 border-blue-600"
                  : "hover:bg-gray-50"
              }`}
            >
              <div className="shrink-0">
                {isCompleted ? (
                  <CheckCircle size={18} className="text-green-500" />
                ) : isActive ? (
                  <PlayCircle size={18} className="text-blue-600" />
                ) : (
                  <Circle size={18} className="text-gray-300" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`truncate ${isActive ? "font-medium text-blue-900" : "text-gray-700"}`}>
                  {i + 1}. {lesson.title}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                  <span>{lesson.durationMinutes} dk</span>
                  {lesson.quiz && (
                    <span className="flex items-center gap-0.5 text-purple-500">
                      <FileQuestion size={10} />
                      Quiz
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
