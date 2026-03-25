"use client";

interface HealthGaugeProps {
  score: number;
  size?: number;
  label?: string;
}

function getScoreColor(score: number) {
  if (score >= 80) return { stroke: "#22c55e", text: "text-green-600" };
  if (score >= 60) return { stroke: "#eab308", text: "text-yellow-600" };
  if (score >= 40) return { stroke: "#f97316", text: "text-orange-600" };
  return { stroke: "#ef4444", text: "text-red-600" };
}

export default function HealthGauge({ score, size = 200, label }: HealthGaugeProps) {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const { stroke, text } = getScoreColor(score);

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="12"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className={`text-4xl font-bold ${text}`}>{score}</span>
        <span className="text-sm text-gray-500">/100</span>
      </div>
      {label && <p className="mt-2 text-sm font-medium text-gray-700">{label}</p>}
    </div>
  );
}
