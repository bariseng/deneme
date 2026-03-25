"use client";

import { RISK_INDICATOR_LABELS } from "@/lib/international-client";

interface Indicator {
  indicator: string;
  value: number;
}

interface RiskRadarProps {
  indicators: Indicator[];
  size?: number;
}

export default function RiskRadar({ indicators, size = 280 }: RiskRadarProps) {
  const center = size / 2;
  const maxRadius = (size - 60) / 2;
  const levels = [25, 50, 75, 100];
  const count = indicators.length || 5;
  const angleStep = (2 * Math.PI) / count;

  function getPoint(index: number, value: number) {
    const angle = angleStep * index - Math.PI / 2;
    const r = (value / 100) * maxRadius;
    return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) };
  }

  // For risk indicators, invert display (lower risk value = better)
  const invertedIndicators = ["payment_risk", "currency_risk", "legal_risk", "security_risk"];

  const displayValues = indicators.map((ind) => ({
    ...ind,
    displayValue: invertedIndicators.includes(ind.indicator) ? 100 - ind.value : ind.value,
  }));

  const polygonPoints = displayValues
    .map((ind, i) => {
      const p = getPoint(i, ind.displayValue);
      return `${p.x},${p.y}`;
    })
    .join(" ");

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="overflow-visible">
        {/* Grid levels */}
        {levels.map((level) => {
          const r = (level / 100) * maxRadius;
          const points = Array.from({ length: count }, (_, i) => {
            const angle = angleStep * i - Math.PI / 2;
            return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
          }).join(" ");
          return (
            <polygon
              key={level}
              points={points}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          );
        })}

        {/* Axis lines */}
        {indicators.map((_, i) => {
          const p = getPoint(i, 100);
          return (
            <line key={i} x1={center} y1={center} x2={p.x} y2={p.y} stroke="#e5e7eb" strokeWidth="1" />
          );
        })}

        {/* Data polygon */}
        <polygon
          points={polygonPoints}
          fill="rgba(59, 130, 246, 0.15)"
          stroke="#3b82f6"
          strokeWidth="2"
        />

        {/* Data points */}
        {displayValues.map((ind, i) => {
          const p = getPoint(i, ind.displayValue);
          return <circle key={i} cx={p.x} cy={p.y} r="4" fill="#3b82f6" />;
        })}

        {/* Labels */}
        {indicators.map((ind, i) => {
          const p = getPoint(i, 120);
          const label = RISK_INDICATOR_LABELS[ind.indicator] || ind.indicator;
          return (
            <text
              key={i}
              x={p.x}
              y={p.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-[10px] fill-gray-600 font-medium"
            >
              {label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
