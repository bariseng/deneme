import { categories } from "./data";

/* ── Types ─────────────────────────────────────── */

export interface DailyTenderStat {
  date: string; // YYYY-MM-DD
  count: number;
  totalBudget: number;
}

export interface SectorStat {
  sector: string;
  count: number;
  totalBudget: number;
  avgBudget: number;
  color: string;
}

export interface CityStat {
  city: string;
  count: number;
  totalBudget: number;
  intensity: number; // 0-1 for heatmap
}

export interface UserActivity {
  date: string;
  loginCount: number;
  searchCount: number;
  pageViews: number;
}

export interface TopSearchTerm {
  term: string;
  count: number;
  change: number; // percentage change vs previous period
}

export interface TopViewedTender {
  tenderId: string;
  title: string;
  views: number;
  institution: string;
}

export interface PeriodComparison {
  metric: string;
  current: number;
  previous: number;
  change: number; // percentage
  unit?: string;
}

export type TimeRange = "daily" | "weekly" | "monthly";

/* ── Seed random helper ────────────────────────── */

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/* ── Generate daily tender stats (last 90 days) ── */

export function generateDailyStats(): DailyTenderStat[] {
  const rand = seededRandom(42);
  const stats: DailyTenderStat[] = [];
  const today = new Date(2026, 2, 25); // 25 March 2026

  for (let i = 89; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);

    // Weekday gets more tenders
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const base = isWeekend ? 5 : 18;
    const count = Math.round(base + rand() * 15);
    const avgBudget = 2_000_000 + rand() * 50_000_000;
    const totalBudget = count * avgBudget;

    stats.push({
      date: d.toISOString().slice(0, 10),
      count,
      totalBudget: Math.round(totalBudget),
    });
  }

  return stats;
}

/* ── Aggregate weekly stats ──────────────────── */

export function aggregateWeekly(daily: DailyTenderStat[]): DailyTenderStat[] {
  const weeks: DailyTenderStat[] = [];
  for (let i = 0; i < daily.length; i += 7) {
    const chunk = daily.slice(i, i + 7);
    if (chunk.length === 0) continue;
    weeks.push({
      date: chunk[0].date,
      count: chunk.reduce((s, d) => s + d.count, 0),
      totalBudget: chunk.reduce((s, d) => s + d.totalBudget, 0),
    });
  }
  return weeks;
}

/* ── Aggregate monthly stats ─────────────────── */

export function aggregateMonthly(daily: DailyTenderStat[]): DailyTenderStat[] {
  const map = new Map<string, DailyTenderStat>();
  for (const d of daily) {
    const month = d.date.slice(0, 7); // YYYY-MM
    const existing = map.get(month);
    if (existing) {
      existing.count += d.count;
      existing.totalBudget += d.totalBudget;
    } else {
      map.set(month, { date: month + "-01", count: d.count, totalBudget: d.totalBudget });
    }
  }
  return Array.from(map.values());
}

/* ── Sector stats (from actual tenders + mock extras) ── */

const sectorColors: Record<string, string> = {
  "Yapım İşleri": "#1a56db",
  "Mal Alımı": "#f97316",
  "Hizmet Alımı": "#10b981",
  "Danışmanlık": "#8b5cf6",
  Bilişim: "#06b6d4",
  Sağlık: "#ef4444",
  Eğitim: "#eab308",
  Ulaşım: "#ec4899",
};

export function generateSectorStats(): SectorStat[] {
  const rand = seededRandom(123);

  return categories.map((cat) => {
    const count = Math.round(rand() * 80 + 20);
    const totalBudget = Math.round(rand() * 5_000_000_000 + 500_000_000);
    return {
      sector: cat.name,
      count,
      totalBudget,
      avgBudget: Math.round(totalBudget / count),
      color: sectorColors[cat.name] || "#6b7280",
    };
  });
}

/* ── City stats (top 20 cities) ──────────────── */

const topCities = [
  "Ankara", "İstanbul", "İzmir", "Antalya", "Bursa", "Konya",
  "Gaziantep", "Mersin", "Kayseri", "Diyarbakır", "Adana",
  "Trabzon", "Eskişehir", "Samsun", "Denizli", "Erzurum",
  "Muğla", "Kocaeli", "Malatya", "Van",
];

export function generateCityStats(): CityStat[] {
  const rand = seededRandom(77);
  const stats = topCities.map((city) => {
    const count = Math.round(rand() * 40 + 5);
    const totalBudget = count * (rand() * 20_000_000 + 5_000_000);
    return {
      city,
      count,
      totalBudget: Math.round(totalBudget),
      intensity: 0,
    };
  });

  // Normalize intensity
  const maxCount = Math.max(...stats.map((s) => s.count));
  stats.forEach((s) => {
    s.intensity = s.count / maxCount;
  });

  return stats.sort((a, b) => b.count - a.count);
}

/* ── User activity (last 30 days) ────────────── */

export function generateUserActivity(): UserActivity[] {
  const rand = seededRandom(55);
  const data: UserActivity[] = [];
  const today = new Date(2026, 2, 25);

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const base = isWeekend ? 50 : 200;

    data.push({
      date: d.toISOString().slice(0, 10),
      loginCount: Math.round(base + rand() * 150),
      searchCount: Math.round(base * 2.5 + rand() * 400),
      pageViews: Math.round(base * 8 + rand() * 2000),
    });
  }

  return data;
}

/* ── Top search terms ────────────────────────── */

export function generateTopSearchTerms(): TopSearchTerm[] {
  return [
    { term: "yapım ihale istanbul", count: 1245, change: 12.3 },
    { term: "hastane inşaat", count: 892, change: -5.2 },
    { term: "asfalt yapım", count: 756, change: 28.7 },
    { term: "bilişim hizmet alımı", count: 634, change: 15.1 },
    { term: "okul onarım", count: 589, change: -2.8 },
    { term: "yol yapım ankara", count: 512, change: 8.4 },
    { term: "tıbbi cihaz alımı", count: 478, change: 32.1 },
    { term: "danışmanlık hizmeti", count: 423, change: -11.5 },
    { term: "temizlik hizmeti", count: 398, change: 4.2 },
    { term: "güvenlik hizmeti", count: 367, change: -7.9 },
  ];
}

/* ── Top viewed tenders ──────────────────────── */

export function generateTopViewedTenders(): TopViewedTender[] {
  // Placeholder — dashboard API (/api/dashboard, /api/stats/*) provides real data
  return [];
}

/* ── Period comparison ───────────────────────── */

export function generatePeriodComparison(): PeriodComparison[] {
  return [
    { metric: "Toplam İhale Sayısı", current: 487, previous: 423, change: 15.1 },
    { metric: "Aktif İhale", current: 312, previous: 278, change: 12.2 },
    {
      metric: "Toplam Bütçe",
      current: 12_450_000_000,
      previous: 10_890_000_000,
      change: 14.3,
      unit: "₺",
    },
    {
      metric: "Ortalama Bütçe",
      current: 25_560_000,
      previous: 25_740_000,
      change: -0.7,
      unit: "₺",
    },
    { metric: "Yeni Kullanıcı", current: 1245, previous: 987, change: 26.1 },
    { metric: "Başvuru Sayısı", current: 3456, previous: 2890, change: 19.6 },
    { metric: "Takip Edilen İhale", current: 8923, previous: 7456, change: 19.7 },
    { metric: "Teklif Oluşturulan", current: 567, previous: 432, change: 31.3 },
  ];
}

/* ── CSV Export utility ──────────────────────── */

export function exportToCSV(
  data: Record<string, string | number>[],
  filename: string
): void {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(";"), // Turkish Excel uses semicolons
    ...data.map((row) =>
      headers
        .map((h) => {
          const val = row[h];
          if (typeof val === "number") {
            return val.toLocaleString("tr-TR");
          }
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(";")
    ),
  ];

  const BOM = "\uFEFF"; // UTF-8 BOM for Turkish characters
  const blob = new Blob([BOM + csvRows.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
