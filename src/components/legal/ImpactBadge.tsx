"use client";

import { AlertTriangle, Info, AlertOctagon, Flame } from "lucide-react";

interface ImpactBadgeProps {
  level: string;
  size?: "sm" | "md";
}

const CONFIG: Record<string, { bg: string; color: string; border: string; label: string; Icon: typeof Info }> = {
  LOW: { bg: "bg-blue-50", color: "text-blue-700", border: "border-blue-200", label: "Düşük Etki", Icon: Info },
  MEDIUM: { bg: "bg-yellow-50", color: "text-yellow-700", border: "border-yellow-200", label: "Orta Etki", Icon: AlertTriangle },
  HIGH: { bg: "bg-orange-50", color: "text-orange-700", border: "border-orange-200", label: "Yüksek Etki", Icon: AlertOctagon },
  CRITICAL: { bg: "bg-red-50", color: "text-red-700", border: "border-red-200", label: "Kritik Etki", Icon: Flame },
};

export default function ImpactBadge({ level, size = "md" }: ImpactBadgeProps) {
  const c = CONFIG[level] || CONFIG.MEDIUM;
  const { Icon } = c;
  const iconSize = size === "sm" ? 12 : 14;
  const padding = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-medium ${c.bg} ${c.color} ${c.border} ${padding}`}>
      <Icon size={iconSize} />
      {c.label}
    </span>
  );
}
