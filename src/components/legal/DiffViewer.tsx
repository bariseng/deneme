"use client";

import { Plus, Minus, PenLine } from "lucide-react";

interface DiffSection {
  section: string;
  type: "added" | "removed" | "modified";
  oldContent?: string;
  newContent?: string;
}

interface DiffViewerProps {
  diffs: {
    oldText: string | null;
    newText: string | null;
    changedSections: DiffSection[];
  }[];
}

function TypeIcon({ type }: { type: string }) {
  if (type === "added") return <Plus size={14} className="text-green-600" />;
  if (type === "removed") return <Minus size={14} className="text-red-600" />;
  return <PenLine size={14} className="text-amber-600" />;
}

function TypeLabel({ type }: { type: string }) {
  if (type === "added") return <span className="text-xs font-medium text-green-700 bg-green-50 px-1.5 py-0.5 rounded">Eklenen</span>;
  if (type === "removed") return <span className="text-xs font-medium text-red-700 bg-red-50 px-1.5 py-0.5 rounded">Kaldırılan</span>;
  return <span className="text-xs font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">Değişen</span>;
}

export default function DiffViewer({ diffs }: DiffViewerProps) {
  if (!diffs || diffs.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-500 text-center">
        Karşılaştırma verisi bulunmuyor.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {diffs.map((diff, di) => (
        <div key={di} className="border rounded-lg overflow-hidden">
          {/* Side by side header */}
          <div className="grid grid-cols-2 bg-gray-50 border-b">
            <div className="px-4 py-2 text-xs font-medium text-red-600 border-r">Eski Metin</div>
            <div className="px-4 py-2 text-xs font-medium text-green-600">Yeni Metin</div>
          </div>

          {/* Full texts */}
          <div className="grid grid-cols-2">
            <div className="px-4 py-3 text-sm text-gray-600 border-r bg-red-50/30 whitespace-pre-wrap">
              {diff.oldText || <span className="text-gray-400 italic">Eski metin yok</span>}
            </div>
            <div className="px-4 py-3 text-sm text-gray-600 bg-green-50/30 whitespace-pre-wrap">
              {diff.newText || <span className="text-gray-400 italic">Yeni metin yok</span>}
            </div>
          </div>

          {/* Changed sections */}
          {diff.changedSections && diff.changedSections.length > 0 && (
            <div className="border-t">
              <div className="px-4 py-2 bg-gray-50 text-xs font-medium text-gray-700">
                Değişiklik Detayları
              </div>
              <div className="divide-y">
                {(diff.changedSections as DiffSection[]).map((sec, si) => (
                  <div key={si} className="px-4 py-3 flex items-start gap-3">
                    <TypeIcon type={sec.type} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <TypeLabel type={sec.type} />
                      </div>
                      {sec.oldContent && (
                        <p className="text-sm text-red-700 bg-red-50 rounded px-2 py-1 mb-1 line-through">
                          {sec.oldContent}
                        </p>
                      )}
                      {sec.newContent && (
                        <p className="text-sm text-green-700 bg-green-50 rounded px-2 py-1">
                          {sec.newContent}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
