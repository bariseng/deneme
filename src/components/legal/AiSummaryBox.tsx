"use client";

import { Sparkles } from "lucide-react";

interface AiSummaryBoxProps {
  summary: string;
  type?: "summary" | "analysis";
}

export default function AiSummaryBox({ summary, type = "summary" }: AiSummaryBoxProps) {
  const isAnalysis = type === "analysis";

  return (
    <div className={`rounded-xl border p-5 ${isAnalysis ? "bg-purple-50 border-purple-200" : "bg-blue-50 border-blue-200"}`}>
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={16} className={isAnalysis ? "text-purple-600" : "text-blue-600"} />
        <span className={`text-sm font-semibold ${isAnalysis ? "text-purple-800" : "text-blue-800"}`}>
          {isAnalysis ? "AI Etki Analizi" : "AI Özet"}
        </span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isAnalysis ? "bg-purple-200 text-purple-700" : "bg-blue-200 text-blue-700"}`}>
          AI ile oluşturuldu
        </span>
      </div>
      <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
        {summary}
      </div>
    </div>
  );
}
