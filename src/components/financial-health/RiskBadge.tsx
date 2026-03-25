"use client";

import { Shield, AlertTriangle, AlertOctagon, XOctagon } from "lucide-react";

interface RiskBadgeProps {
  level: string;
  size?: "sm" | "md" | "lg";
}

const CONFIG: Record<string, { bg: string; text: string; border: string; label: string; Icon: typeof Shield }> = {
  LOW: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", label: "Düşük Risk", Icon: Shield },
  MEDIUM: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200", label: "Orta Risk", Icon: AlertTriangle },
  HIGH: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", label: "Yüksek Risk", Icon: AlertOctagon },
  CRITICAL: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", label: "Kritik Risk", Icon: XOctagon },
};

const SIZES = {
  sm: { icon: 12, text: "text-xs", px: "px-2 py-0.5" },
  md: { icon: 14, text: "text-sm", px: "px-3 py-1" },
  lg: { icon: 18, text: "text-base", px: "px-4 py-1.5" },
};

export default function RiskBadge({ level, size = "md" }: RiskBadgeProps) {
  const config = CONFIG[level] || CONFIG.MEDIUM;
  const sizeConfig = SIZES[size];
  const { Icon } = config;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border ${config.bg} ${config.text} ${config.border} ${sizeConfig.px} ${sizeConfig.text} font-medium`}>
      <Icon size={sizeConfig.icon} />
      {config.label}
    </span>
  );
}
