"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Award, CheckCircle, XCircle, GraduationCap, Clock, Share2 } from "lucide-react";

interface CertData {
  valid: boolean;
  certificateNumber: string;
  issuedAt: string;
  user: { name: string | null; image: string | null };
  course: { title: string; category: string; difficulty: string; durationMinutes: number };
}

const DIFF_LABELS: Record<string, string> = {
  BASLANGIC: "Başlangıç",
  ORTA: "Orta",
  ILERI: "İleri",
  UZMAN: "Uzman",
};

export default function SertifikaDogrulamaClient() {
  const params = useParams();
  const number = params.number as string;

  const [cert, setCert] = useState<CertData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/academy/certificates/${number}`);
      if (res.ok) {
        setCert(await res.json());
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [number]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Doğrulanıyor...</div>;

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl border p-8 max-w-md text-center">
          <XCircle size={64} className="mx-auto text-red-500 mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Sertifika Bulunamadı</h1>
          <p className="text-gray-500 mb-4">
            &quot;{number}&quot; numaralı sertifika sistemimizde kayıtlı değildir.
          </p>
          <Link href="/akademi" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            Akademi&apos;ye Git
          </Link>
        </div>
      </div>
    );
  }

  if (!cert) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border-2 border-blue-200 shadow-lg max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-center text-white">
          <Award size={56} className="mx-auto mb-3 opacity-90" />
          <h1 className="text-2xl font-bold">Başarı Sertifikası</h1>
          <p className="text-blue-200 mt-1">İhalePro Akademi</p>
        </div>

        {/* Verification Badge */}
        <div className="flex justify-center -mt-5">
          <div className="bg-green-500 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
            <CheckCircle size={18} />
            <span className="font-semibold text-sm">Doğrulandı</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 text-center">
          <p className="text-gray-500 text-sm mb-1">Bu belge ile tasdik olunur ki</p>
          <p className="text-2xl font-bold text-gray-900 mb-2">{cert.user.name || "Kullanıcı"}</p>
          <p className="text-gray-500 mb-1">aşağıdaki kursu başarıyla tamamlamıştır:</p>
          <p className="text-xl font-semibold text-blue-700 mb-4">{cert.course.title}</p>

          <div className="flex justify-center gap-6 text-sm text-gray-500 mb-6">
            <span className="flex items-center gap-1">
              <GraduationCap size={14} />
              {DIFF_LABELS[cert.course.difficulty] || cert.course.difficulty}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={14} />
              {cert.course.durationMinutes} dk
            </span>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Sertifika No</span>
                <p className="font-mono font-medium text-gray-900">{cert.certificateNumber}</p>
              </div>
              <div>
                <span className="text-gray-400">Veriliş Tarihi</span>
                <p className="font-medium text-gray-900">{new Date(cert.issuedAt).toLocaleDateString("tr-TR")}</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              const url = window.location.href;
              const text = `${cert.user.name} - ${cert.course.title} sertifikası | İhalePro Akademi`;
              window.open(
                `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&summary=${encodeURIComponent(text)}`,
                "_blank"
              );
            }}
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            <Share2 size={14} />
            LinkedIn&apos;de Paylaş
          </button>
        </div>

        <div className="border-t px-8 py-4 text-center">
          <p className="text-xs text-gray-400">
            Bu sertifika İhalePro Akademi tarafından verilmiştir.
            Doğrulama: {typeof window !== "undefined" ? window.location.href : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
