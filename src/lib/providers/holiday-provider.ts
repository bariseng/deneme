// ─── Holiday Provider ─────────────────────────────────────
// Calendarific API primary, Holiday API fallback
// Turkish official holidays including religious holidays

import { ProviderCache } from "./cache";

// ─── Types ──────────────────────────────────────────────────

export interface Holiday {
  date: Date;
  name: string;
  type: "RESMI_TATIL" | "DINI_BAYRAM" | "MILLI_BAYRAM" | "OZEL";
  description?: string;
}

interface CalendarificHoliday {
  name: string;
  description: string;
  date: { iso: string };
  type: string[];
  primary_type: string;
}

interface HolidayApiHoliday {
  name: string;
  date: string;
  observed: string;
  public: boolean;
}

// ─── Config ─────────────────────────────────────────────────

const cache = new ProviderCache();
const CACHE_TTL = 86400 * 30; // 30 days — holidays don't change often

// Turkish holiday name → type mapping
const HOLIDAY_TYPE_MAP: Record<string, Holiday["type"]> = {
  "Yılbaşı": "RESMI_TATIL",
  "New Year": "RESMI_TATIL",
  "Ulusal Egemenlik": "MILLI_BAYRAM",
  "National Sovereignty": "MILLI_BAYRAM",
  "Çocuk Bayramı": "MILLI_BAYRAM",
  "Children's Day": "MILLI_BAYRAM",
  "Emek": "RESMI_TATIL",
  "Labour Day": "RESMI_TATIL",
  "Labor Day": "RESMI_TATIL",
  "Gençlik": "MILLI_BAYRAM",
  "Youth": "MILLI_BAYRAM",
  "Demokrasi": "MILLI_BAYRAM",
  "Democracy": "MILLI_BAYRAM",
  "Zafer": "MILLI_BAYRAM",
  "Victory": "MILLI_BAYRAM",
  "Cumhuriyet": "MILLI_BAYRAM",
  "Republic": "MILLI_BAYRAM",
  "Ramazan": "DINI_BAYRAM",
  "Ramadan": "DINI_BAYRAM",
  "Eid al-Fitr": "DINI_BAYRAM",
  "Kurban": "DINI_BAYRAM",
  "Eid al-Adha": "DINI_BAYRAM",
  "Sacrifice": "DINI_BAYRAM",
};

function classifyHoliday(name: string): Holiday["type"] {
  for (const [keyword, type] of Object.entries(HOLIDAY_TYPE_MAP)) {
    if (name.includes(keyword)) return type;
  }
  return "RESMI_TATIL";
}

// ─── Calendarific API (Primary) ─────────────────────────────

async function fetchFromCalendarific(year: number): Promise<Holiday[]> {
  const apiKey = process.env.CALENDARIFIC_API_KEY;
  if (!apiKey) throw new Error("CALENDARIFIC_API_KEY tanımlanmalı");

  const url = `https://calendarific.com/api/v2/holidays?api_key=${apiKey}&country=TR&year=${year}&type=national,observance`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Calendarific API hatası: ${response.status}`);
  }

  const data = await response.json();
  const holidays: CalendarificHoliday[] = data.response?.holidays || [];

  return holidays.map((h) => ({
    date: new Date(h.date.iso),
    name: h.name,
    type: classifyHoliday(h.name),
    description: h.description,
  }));
}

// ─── Holiday API (Fallback) ─────────────────────────────────

async function fetchFromHolidayApi(year: number): Promise<Holiday[]> {
  const apiKey = process.env.HOLIDAY_API_KEY;
  if (!apiKey) throw new Error("HOLIDAY_API_KEY tanımlanmalı");

  const url = `https://holidayapi.com/v1/holidays?pretty&key=${apiKey}&country=TR&year=${year}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Holiday API hatası: ${response.status}`);
  }

  const data = await response.json();
  const holidays: HolidayApiHoliday[] = data.holidays || [];

  return holidays
    .filter((h) => h.public)
    .map((h) => ({
      date: new Date(h.date),
      name: h.name,
      type: classifyHoliday(h.name),
    }));
}

// ─── Public API ─────────────────────────────────────────────

export async function getHolidays(year: number): Promise<Holiday[]> {
  const cacheKey = `holidays:TR:${year}`;
  const cached = await cache.get<Holiday[]>(cacheKey);
  if (cached) {
    return cached.map((h) => ({ ...h, date: new Date(h.date) }));
  }

  let holidays: Holiday[];

  // Try Calendarific first, fallback to Holiday API
  try {
    holidays = await fetchFromCalendarific(year);
  } catch (calErr) {
    console.warn("Calendarific API başarısız, Holiday API deneniyor:", calErr);
    try {
      holidays = await fetchFromHolidayApi(year);
    } catch (holErr) {
      console.error("Her iki tatil API'si de başarısız:", holErr);
      throw new Error("Tatil verileri alınamadı. API anahtarlarını kontrol edin.");
    }
  }

  // Cache the result
  await cache.set(cacheKey, holidays, { ttl: CACHE_TTL, staleWhileRevalidate: true, key: "holiday" }, "Holiday");
  return holidays;
}

export async function getHolidaysInRange(start: Date, end: Date): Promise<Holiday[]> {
  const years = new Set<number>();
  for (let y = start.getFullYear(); y <= end.getFullYear(); y++) {
    years.add(y);
  }

  const allHolidays: Holiday[] = [];
  for (const year of years) {
    const holidays = await getHolidays(year);
    allHolidays.push(...holidays);
  }

  return allHolidays.filter((h) => h.date >= start && h.date <= end);
}

export async function isHoliday(date: Date): Promise<boolean> {
  const holidays = await getHolidays(date.getFullYear());
  const dateStr = date.toISOString().split("T")[0];
  return holidays.some((h) => h.date.toISOString().split("T")[0] === dateStr);
}

export async function countWorkingDays(start: Date, end: Date): Promise<number> {
  const holidays = await getHolidaysInRange(start, end);
  const holidayDates = new Set(holidays.map((h) => h.date.toISOString().split("T")[0]));

  let workingDays = 0;
  const current = new Date(start);
  while (current <= end) {
    const day = current.getDay();
    const dateStr = current.toISOString().split("T")[0];
    // Skip weekends (Sat=6, Sun=0) and holidays
    if (day !== 0 && day !== 6 && !holidayDates.has(dateStr)) {
      workingDays++;
    }
    current.setDate(current.getDate() + 1);
  }

  return workingDays;
}
