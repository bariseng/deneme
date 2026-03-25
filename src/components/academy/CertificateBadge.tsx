"use client";

import { Award, ExternalLink, Share2 } from "lucide-react";

interface CertificateBadgeProps {
  certificateNumber: string;
  courseName: string;
  userName?: string;
  issuedAt: string;
  difficulty?: string;
  compact?: boolean;
}

const DIFF_COLORS: Record<string, string> = {
  BASLANGIC: "from-green-400 to-green-600",
  ORTA: "from-blue-400 to-blue-600",
  ILERI: "from-orange-400 to-orange-600",
  UZMAN: "from-red-400 to-red-600",
};

export default function CertificateBadge({
  certificateNumber,
  courseName,
  userName,
  issuedAt,
  difficulty,
  compact = false,
}: CertificateBadgeProps) {
  const gradient = difficulty ? (DIFF_COLORS[difficulty] || DIFF_COLORS.BASLANGIC) : "from-blue-400 to-blue-600";

  const handleLinkedInShare = () => {
    const url = `${window.location.origin}/sertifika/${certificateNumber}`;
    const text = `İhalePro Akademi'de "${courseName}" kursunu tamamladım! 🎓`;
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&summary=${encodeURIComponent(text)}`,
      "_blank"
    );
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3 bg-white rounded-lg border p-3">
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center`}>
          <Award size={20} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{courseName}</p>
          <p className="text-xs text-gray-400">{certificateNumber}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className={`bg-gradient-to-r ${gradient} p-6 text-center text-white`}>
        <Award size={48} className="mx-auto mb-2 opacity-90" />
        <h3 className="text-lg font-bold">Başarı Sertifikası</h3>
        <p className="text-sm opacity-80 mt-1">İhalePro Akademi</p>
      </div>
      <div className="p-6 text-center">
        {userName && (
          <p className="text-xl font-bold text-gray-900 mb-1">{userName}</p>
        )}
        <p className="text-gray-600 mb-1">başarıyla tamamlamıştır:</p>
        <p className="text-lg font-semibold text-blue-700 mb-3">{courseName}</p>
        <div className="flex items-center justify-center gap-4 text-sm text-gray-400 mb-4">
          <span>{new Date(issuedAt).toLocaleDateString("tr-TR")}</span>
          <span>{certificateNumber}</span>
        </div>
        <div className="flex gap-2 justify-center">
          <a
            href={`/sertifika/${certificateNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
          >
            <ExternalLink size={14} />
            Doğrula
          </a>
          <button
            onClick={handleLinkedInShare}
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
          >
            <Share2 size={14} />
            LinkedIn&apos;de Paylaş
          </button>
        </div>
      </div>
    </div>
  );
}
