// ─── Çakışma Algılama Servisi ─────────────────────────────
// Aynı gün birden fazla ihale deadline, kaynak çakışması
// Otomatik uyarı ve önceliklendirme önerisi

import { prisma } from "@/lib/prisma";

// ─── Types ──────────────────────────────────────────────────

export interface ConflictReport {
  date: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  events: ConflictEvent[];
  recommendation: string;
}

export interface ConflictEvent {
  id: string;
  title: string;
  tenderId: string | null;
  eventType: string;
  startDate: string;
  estimatedCost: number | null;
  institution: string | null;
  priority: number; // 1-10
}

export interface ResourceConflict {
  date: string;
  tenderIds: string[];
  tenderTitles: string[];
  issue: string;
  suggestion: string;
}

export interface ConflictSummary {
  totalConflicts: number;
  criticalCount: number;
  dateConflicts: ConflictReport[];
  resourceConflicts: ResourceConflict[];
  upcomingDeadlines: number;
}

// ─── Conflict Detection ─────────────────────────────────────

export async function detectAllConflicts(
  userId: string,
  daysAhead: number = 30,
): Promise<ConflictSummary> {
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + daysAhead);

  const events = await prisma.calendarEvent.findMany({
    where: {
      userId,
      eventType: "SON_BASVURU",
      startDate: { gte: now, lte: end },
    },
    include: {
      tender: {
        select: {
          id: true,
          title: true,
          institution: true,
          estimatedCost: true,
          city: true,
          tenderType: true,
        },
      },
    },
    orderBy: { startDate: "asc" },
  });

  // Group by date
  const byDate: Record<string, typeof events> = {};
  for (const evt of events) {
    const dateKey = evt.startDate.toISOString().split("T")[0];
    if (!byDate[dateKey]) byDate[dateKey] = [];
    byDate[dateKey].push(evt);
  }

  // Detect date conflicts (2+ deadlines on same day)
  const dateConflicts: ConflictReport[] = [];
  for (const [date, evts] of Object.entries(byDate)) {
    if (evts.length < 2) continue;

    const conflictEvents: ConflictEvent[] = evts.map((e) => ({
      id: e.id,
      title: e.title,
      tenderId: e.tenderId,
      eventType: e.eventType,
      startDate: e.startDate.toISOString(),
      estimatedCost: e.tender?.estimatedCost ? Number(e.tender.estimatedCost) : null,
      institution: e.tender?.institution || null,
      priority: calculatePriority(e),
    }));

    // Sort by priority descending
    conflictEvents.sort((a, b) => b.priority - a.priority);

    const severity = getSeverity(evts.length);
    const recommendation = generateRecommendation(conflictEvents, date);

    dateConflicts.push({ date, severity, events: conflictEvents, recommendation });
  }

  // Detect resource conflicts (same type, same city, overlapping)
  const resourceConflicts = detectResourceConflicts(events);

  return {
    totalConflicts: dateConflicts.length,
    criticalCount: dateConflicts.filter((c) => c.severity === "CRITICAL").length,
    dateConflicts: dateConflicts.sort((a, b) => a.date.localeCompare(b.date)),
    resourceConflicts,
    upcomingDeadlines: events.length,
  };
}

// ─── Priority Calculation ───────────────────────────────────

function calculatePriority(event: {
  startDate: Date;
  tender?: { estimatedCost: unknown; tenderType: string | null } | null;
}): number {
  let priority = 5; // Base

  // Sooner deadline → higher priority
  const daysLeft = Math.ceil(
    (event.startDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  if (daysLeft <= 1) priority += 3;
  else if (daysLeft <= 3) priority += 2;
  else if (daysLeft <= 7) priority += 1;

  // Higher budget → higher priority
  const cost = Number(event.tender?.estimatedCost || 0);
  if (cost > 10_000_000) priority += 2;
  else if (cost > 1_000_000) priority += 1;

  return Math.min(10, priority);
}

function getSeverity(eventCount: number): ConflictReport["severity"] {
  if (eventCount >= 4) return "CRITICAL";
  if (eventCount >= 3) return "HIGH";
  if (eventCount >= 2) return "MEDIUM";
  return "LOW";
}

// ─── Recommendation Engine ──────────────────────────────────

function generateRecommendation(events: ConflictEvent[], date: string): string {
  const count = events.length;
  const topEvent = events[0];
  const totalBudget = events.reduce((sum, e) => sum + (e.estimatedCost || 0), 0);

  const parts: string[] = [];

  parts.push(`${date} tarihinde ${count} ihale son başvurusu çakışıyor.`);

  if (topEvent.estimatedCost) {
    parts.push(
      `En yüksek bütçeli ihale: "${topEvent.title}" (₺${topEvent.estimatedCost.toLocaleString("tr-TR")}).`,
    );
  }

  if (count > 2) {
    parts.push("Tüm ihalelere aynı gün başvuru zor olabilir. Ekip dağılımı yapın.");
  }

  if (totalBudget > 5_000_000) {
    parts.push("Toplam bütçe yüksek — öncelikli ihalelere odaklanın.");
  }

  parts.push(`Öneri: "${topEvent.title}" ihalesi öncelikli işlenmeli (Öncelik: ${topEvent.priority}/10).`);

  return parts.join(" ");
}

// ─── Resource Conflicts ─────────────────────────────────────

function detectResourceConflicts(
  events: {
    id: string;
    tenderId: string | null;
    title: string;
    startDate: Date;
    tender?: { city: string; tenderType: string | null } | null;
  }[],
): ResourceConflict[] {
  const conflicts: ResourceConflict[] = [];

  // Group by date + city
  const byCityDate: Record<string, typeof events> = {};
  for (const evt of events) {
    if (!evt.tender?.city) continue;
    const key = `${evt.startDate.toISOString().split("T")[0]}:${evt.tender.city}`;
    if (!byCityDate[key]) byCityDate[key] = [];
    byCityDate[key].push(evt);
  }

  for (const [key, evts] of Object.entries(byCityDate)) {
    if (evts.length < 2) continue;
    const [date, city] = key.split(":");
    conflicts.push({
      date,
      tenderIds: evts.map((e) => e.tenderId).filter((id): id is string => id !== null),
      tenderTitles: evts.map((e) => e.title),
      issue: `${city} ilinde aynı gün ${evts.length} ihale son başvurusu var`,
      suggestion: `Aynı ildeki ihaleler için tek ekip gönderilebilir. Lojistik planlaması yapın.`,
    });
  }

  // Group by date + type
  const byTypeDate: Record<string, typeof events> = {};
  for (const evt of events) {
    if (!evt.tender?.tenderType) continue;
    const key = `${evt.startDate.toISOString().split("T")[0]}:${evt.tender.tenderType}`;
    if (!byTypeDate[key]) byTypeDate[key] = [];
    byTypeDate[key].push(evt);
  }

  for (const [key, evts] of Object.entries(byTypeDate)) {
    if (evts.length < 2) continue;
    const [date, type] = key.split(":");
    conflicts.push({
      date,
      tenderIds: evts.map((e) => e.tenderId).filter((id): id is string => id !== null),
      tenderTitles: evts.map((e) => e.title),
      issue: `Aynı gün ${evts.length} adet ${type} türü ihale son başvurusu var`,
      suggestion: `Benzer türdeki ihaleler için hazırlanan belgeler paylaşılabilir. Ortak belge şablonu kullanın.`,
    });
  }

  return conflicts;
}

// ─── Quick Check ────────────────────────────────────────────

export async function hasConflictsOnDate(
  userId: string,
  date: Date,
): Promise<{ hasConflict: boolean; count: number }> {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const count = await prisma.calendarEvent.count({
    where: {
      userId,
      eventType: "SON_BASVURU",
      startDate: { gte: dayStart, lte: dayEnd },
    },
  });

  return { hasConflict: count >= 2, count };
}
