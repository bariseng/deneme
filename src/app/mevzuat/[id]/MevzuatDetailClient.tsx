"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, ExternalLink, Sparkles, Lock } from "lucide-react";
import ImpactBadge from "@/components/legal/ImpactBadge";
import DiffViewer from "@/components/legal/DiffViewer";
import AiSummaryBox from "@/components/legal/AiSummaryBox";
import { SOURCE_LABELS, CATEGORY_LABELS } from "@/lib/legal-scanner-client";

interface DiffData {
  oldText: string | null;
  newText: string | null;
  changedSections: { section: string; type: "added" | "removed" | "modified"; oldContent?: string; newContent?: string }[];
}

interface UpdateData {
  id: string;
  title: string;
  source: string;
  category: string;
  impactLevel: string;
  summary: string;
  aiSummary: string | null;
  originalUrl: string;
  publishDate: string;
  rawContent: string | null;
  diffs: DiffData[];
}

export default function MevzuatDetailClient() {
  const params = useParams();
  const id = params.id as string;
  const [update, setUpdate] = useState<UpdateData | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/legal/updates/${id}`);
        if (res.ok) setUpdate(await res.json());
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function handleAnalyze() {
    setAnalyzing(true);
    setAnalyzeError("");
    try {
      const res = await fetch("/api/legal/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updateId: id }),
      });

      if (res.status === 403) {
        setAnalyzeError("Etki analizi premium üyelik gerektirir.");
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setAnalysis(data.analysis);
      }
    } catch {
      setAnalyzeError("Analiz yapılırken hata oluştu.");
    } finally {
      setAnalyzing(false);
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Yükleniyor...</div>;
  if (!update) return <div className="min-h-screen flex items-center justify-center text-gray-500">Güncelleme bulunamadı</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <Link href="/mevzuat" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft size={16} />
          Mevzuat Radarı
        </Link>

        {/* Header */}
        <div className="bg-white rounded-xl border p-6 mb-6">
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <span className="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-600">
              {SOURCE_LABELS[update.source] || update.source}
            </span>
            <span className="px-2 py-0.5 text-xs font-medium rounded bg-indigo-50 text-indigo-700">
              {CATEGORY_LABELS[update.category] || update.category}
            </span>
            <ImpactBadge level={update.impactLevel} />
          </div>

          <h1 className="text-xl font-bold text-gray-900 mb-3">{update.title}</h1>

          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar size={14} />
              {new Date(update.publishDate).toLocaleDateString("tr-TR", {
                day: "numeric", month: "long", year: "numeric",
              })}
            </span>
            <a
              href={update.originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-600 hover:underline"
            >
              Orijinal Kaynak <ExternalLink size={12} />
            </a>
          </div>
        </div>

        {/* AI Summary */}
        {update.aiSummary && (
          <div className="mb-6">
            <AiSummaryBox summary={update.aiSummary} />
          </div>
        )}

        {/* Raw Content */}
        {update.rawContent && (
          <div className="bg-white rounded-xl border p-6 mb-6">
            <h2 className="font-semibold text-gray-900 mb-3">Tam Metin</h2>
            <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed bg-gray-50 rounded-lg p-4">
              {update.rawContent}
            </div>
          </div>
        )}

        {/* Diff View */}
        {update.diffs && update.diffs.length > 0 && (
          <div className="bg-white rounded-xl border p-6 mb-6">
            <h2 className="font-semibold text-gray-900 mb-4">Değişiklik Karşılaştırması</h2>
            <DiffViewer diffs={update.diffs} />
          </div>
        )}

        {/* Impact Analysis Button */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Sparkles size={18} className="text-purple-600" />
            Bu sizi nasıl etkiler?
          </h2>

          {analysis ? (
            <AiSummaryBox summary={analysis} type="analysis" />
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                AI destekli etki analizi ile bu değişikliğin firmanıza etkisini öğrenin.
              </p>

              {analyzeError && (
                <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <Lock size={14} />
                  {analyzeError}
                </div>
              )}

              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="inline-flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
              >
                {analyzing ? "Analiz ediliyor..." : (
                  <>
                    <Sparkles size={14} />
                    Etki Analizi Yap (Premium)
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
