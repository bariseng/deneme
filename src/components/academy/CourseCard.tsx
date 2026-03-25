"use client";

import Link from "next/link";
import { Clock, Users, Lock, BookOpen } from "lucide-react";

interface CourseCardProps {
  slug: string;
  title: string;
  description: string;
  thumbnailUrl?: string | null;
  category: string;
  difficulty: string;
  durationMinutes: number;
  isPremium: boolean;
  price?: string | null;
  studentCount?: number;
  lessonCount?: number;
}

const DIFFICULTY_MAP: Record<string, { label: string; color: string }> = {
  BASLANGIC: { label: "Başlangıç", color: "bg-green-100 text-green-800" },
  ORTA: { label: "Orta", color: "bg-blue-100 text-blue-800" },
  ILERI: { label: "İleri", color: "bg-orange-100 text-orange-800" },
  UZMAN: { label: "Uzman", color: "bg-red-100 text-red-800" },
};

const CATEGORY_COLORS: Record<string, string> = {
  MEVZUAT: "from-blue-500 to-blue-700",
  EKAP: "from-emerald-500 to-emerald-700",
  TEKLIF: "from-purple-500 to-purple-700",
  SOZLESME: "from-orange-500 to-orange-700",
  FINANS: "from-teal-500 to-teal-700",
};

export default function CourseCard({
  slug, title, description, category, difficulty,
  durationMinutes, isPremium, price, studentCount, lessonCount,
}: CourseCardProps) {
  const diff = DIFFICULTY_MAP[difficulty] || DIFFICULTY_MAP.BASLANGIC;
  const gradient = CATEGORY_COLORS[category] || "from-gray-500 to-gray-700";

  return (
    <Link href={`/akademi/${slug}`} className="group block">
      <div className="bg-white rounded-xl border hover:border-blue-300 hover:shadow-lg transition-all overflow-hidden">
        {/* Thumbnail */}
        <div className={`h-36 bg-gradient-to-br ${gradient} relative flex items-center justify-center`}>
          <BookOpen size={48} className="text-white/30" />
          {isPremium && (
            <div className="absolute top-3 right-3 bg-yellow-400 text-yellow-900 px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1">
              <Lock size={10} />
              Premium
            </div>
          )}
          <div className="absolute bottom-3 left-3">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${diff.color}`}>
              {diff.label}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 mb-1">
            {title}
          </h3>
          <p className="text-sm text-gray-500 line-clamp-2 mb-3">{description}</p>

          <div className="flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {durationMinutes} dk
              </span>
              {lessonCount !== undefined && (
                <span className="flex items-center gap-1">
                  <BookOpen size={12} />
                  {lessonCount} ders
                </span>
              )}
              {studentCount !== undefined && studentCount > 0 && (
                <span className="flex items-center gap-1">
                  <Users size={12} />
                  {studentCount}
                </span>
              )}
            </div>
            {isPremium && price && (
              <span className="font-semibold text-emerald-600">
                {Number(price).toLocaleString("tr-TR")} ₺
              </span>
            )}
            {!isPremium && (
              <span className="font-semibold text-emerald-600">Ücretsiz</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
