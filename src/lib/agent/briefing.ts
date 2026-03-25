/**
 * Haftalık AI Brifing — Kullanıcıya özetlenmiş ihale istihbaratı
 */

export interface WeeklyBriefing {
  period: string;
  summary: string;
  newMatchCount: number;
  topMatches: {
    tenderId: string;
    title: string;
    matchScore: number;
    city: string;
    deadline: string;
    estimatedCost: string;
  }[];
  sectorTrends: {
    sector: string;
    direction: "up" | "down" | "stable";
    changePercent: number;
  }[];
  actionItems: string[];
  competitorActivity: string[];
  stats: {
    totalScanned: number;
    matchedCount: number;
    avgMatchScore: number;
    upcomingDeadlines: number;
  };
}

export function generateBriefingSummary(briefing: WeeklyBriefing): string {
  const lines: string[] = [];

  lines.push(`**Haftalık İhale Brifing — ${briefing.period}**\n`);
  lines.push(briefing.summary);
  lines.push("");

  // Stats
  lines.push("**Genel Bakış:**");
  lines.push(`• ${briefing.stats.totalScanned} ihale tarandı, ${briefing.stats.matchedCount} tanesi profilinize uygun`);
  lines.push(`• Ortalama uyumluluk skoru: %${briefing.stats.avgMatchScore}`);
  lines.push(`• ${briefing.stats.upcomingDeadlines} ihalenin son başvuru tarihi yaklaşıyor`);
  lines.push("");

  // Top matches
  if (briefing.topMatches.length > 0) {
    lines.push("**En Uygun İhaleler:**");
    for (const match of briefing.topMatches.slice(0, 5)) {
      lines.push(`• **${match.title}** — ${match.city} | %${match.matchScore} uyum | Son: ${match.deadline}`);
    }
    lines.push("");
  }

  // Trends
  if (briefing.sectorTrends.length > 0) {
    lines.push("**Sektör Trendleri:**");
    for (const trend of briefing.sectorTrends) {
      const icon = trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "→";
      lines.push(`• ${trend.sector}: ${icon} %${Math.abs(trend.changePercent)}`);
    }
    lines.push("");
  }

  // Action items
  if (briefing.actionItems.length > 0) {
    lines.push("**Aksiyon Önerileri:**");
    for (const item of briefing.actionItems) {
      lines.push(`• ${item}`);
    }
  }

  return lines.join("\n");
}
