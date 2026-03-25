"use client";

interface SubscoreBarProps {
  label: string;
  score: number;
  weight: string;
  benchmark?: number;
}

function getBarColor(score: number) {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-yellow-500";
  if (score >= 40) return "bg-orange-500";
  return "bg-red-500";
}

export default function SubscoreBar({ label, score, weight, benchmark }: SubscoreBarProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <span className="text-xs text-gray-400">({weight})</span>
        </div>
        <span className="text-sm font-bold text-gray-900">{score}</span>
      </div>
      <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${getBarColor(score)} transition-all duration-700 ease-out`}
          style={{ width: `${score}%` }}
        />
        {benchmark !== undefined && (
          <div
            className="absolute top-0 h-full w-0.5 bg-gray-800"
            style={{ left: `${benchmark}%` }}
            title={`Sektör ortalaması: ${benchmark}`}
          />
        )}
      </div>
      {benchmark !== undefined && (
        <div className="flex justify-end">
          <span className="text-[10px] text-gray-400">Sektör ort: {benchmark}</span>
        </div>
      )}
    </div>
  );
}
