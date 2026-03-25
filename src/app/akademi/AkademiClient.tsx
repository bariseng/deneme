"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  GraduationCap,
  Search,
  Filter,
  BookOpen,
  Trophy,
  Users,
  Award,
} from "lucide-react";
import CourseCard from "@/components/academy/CourseCard";
import ProgressRing from "@/components/academy/ProgressRing";

interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnailUrl: string | null;
  category: string;
  difficulty: string;
  durationMinutes: number;
  isPremium: boolean;
  price: string | null;
  _count: { lessons: number; progress: number };
}

interface ProgressItem {
  courseId: string;
  completedLessons: string[];
  completedAt: string | null;
  course: {
    id: string; title: string; slug: string; thumbnailUrl: string | null;
    category: string; difficulty: string;
    _count: { lessons: number };
  };
}

interface Stats {
  totalCourses: number;
  totalStudents: number;
  totalCertificates: number;
  userEnrolled: number;
  userCompleted: number;
}

const CATEGORIES = [
  { value: "", label: "Tümü" },
  { value: "MEVZUAT", label: "Mevzuat" },
  { value: "EKAP", label: "EKAP" },
  { value: "TEKLIF", label: "Teklif" },
  { value: "SOZLESME", label: "Sözleşme" },
  { value: "FINANS", label: "Finans" },
];

const DIFFICULTIES = [
  { value: "", label: "Tüm Seviyeler" },
  { value: "BASLANGIC", label: "Başlangıç" },
  { value: "ORTA", label: "Orta" },
  { value: "ILERI", label: "İleri" },
  { value: "UZMAN", label: "Uzman" },
];

export default function AkademiClient() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      if (difficulty) params.set("difficulty", difficulty);
      if (search) params.set("search", search);
      params.set("seed", "true");

      const [coursesRes, progressRes] = await Promise.all([
        fetch(`/api/academy/courses?${params}`),
        fetch("/api/academy/progress").catch(() => null),
      ]);

      if (coursesRes.ok) setCourses(await coursesRes.json());
      if (progressRes?.ok) {
        const data = await progressRes.json();
        setProgress(data.progress || []);
        setStats(data.stats || null);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [category, difficulty, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const enrolledCourseIds = new Set(progress.map((p) => p.courseId));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <GraduationCap className="text-blue-600" size={32} />
              İhale Akademisi
            </h1>
            <p className="text-gray-500 mt-1">
              İhale mevzuatı, EKAP ve teklif hazırlama eğitimleri
            </p>
          </div>
          <Link
            href="/akademi/sertifikalarim"
            className="inline-flex items-center gap-2 border border-blue-200 bg-blue-50 text-blue-700 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-100"
          >
            <Award size={16} />
            Sertifikalarım
          </Link>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
            {[
              { label: "Toplam Kurs", value: stats.totalCourses, icon: BookOpen, color: "text-blue-600" },
              { label: "Öğrenci Sayısı", value: stats.totalStudents, icon: Users, color: "text-purple-600" },
              { label: "Sertifika", value: stats.totalCertificates, icon: Trophy, color: "text-yellow-600" },
              { label: "Kayıtlı Kurslarım", value: stats.userEnrolled, icon: GraduationCap, color: "text-emerald-600" },
              { label: "Tamamladığım", value: stats.userCompleted, icon: Award, color: "text-green-600" },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <s.icon size={18} className={s.color} />
                  <span className="text-sm text-gray-500">{s.label}</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* My Progress */}
        {progress.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Devam Eden Kurslarım</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {progress.filter((p) => !p.completedAt).map((p) => {
                const total = p.course._count.lessons;
                const done = p.completedLessons.length;
                const percent = total > 0 ? (done / total) * 100 : 0;

                return (
                  <Link
                    key={p.courseId}
                    href={`/akademi/${p.course.slug}`}
                    className="bg-white rounded-xl border p-4 flex items-center gap-4 hover:border-blue-300 hover:shadow-md transition-all"
                  >
                    <ProgressRing percent={percent} size={60} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{p.course.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{done}/{total} ders tamamlandı</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl border p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Filter size={18} className="text-gray-400" />
            <span className="font-medium text-gray-700">Filtreler</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Kurs ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-1 overflow-x-auto">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCategory(c.value)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    category === c.value
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              {DIFFICULTIES.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Course Grid */}
        {loading ? (
          <div className="text-center py-20 text-gray-500">Yükleniyor...</div>
        ) : courses.length === 0 ? (
          <div className="text-center py-20">
            <GraduationCap size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-600">Kurs bulunamadı</h3>
            <p className="text-gray-400 mt-1">Filtrelerinizi değiştirmeyi deneyin</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                slug={course.slug}
                title={course.title}
                description={course.description}
                thumbnailUrl={course.thumbnailUrl}
                category={course.category}
                difficulty={course.difficulty}
                durationMinutes={course.durationMinutes}
                isPremium={course.isPremium}
                price={course.price}
                studentCount={course._count.progress}
                lessonCount={course._count.lessons}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
