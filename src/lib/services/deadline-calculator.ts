// ─── İhale Süre Hesaplayıcı (4734/Madde 13) ────────────────
// Calculates tender deadlines per 4734 Kamu İhale Kanunu
// Handles working days, official holidays, half-days
// Holidays fetched from Calendarific/Holiday API (no hardcoded dates)

import { getHolidays as fetchHolidaysFromApi } from "@/lib/providers/holiday-provider";

// ─── Types ──────────────────────────────────────────────────

export interface DeadlineInput {
  /** İlan tarihi */
  announcementDate: string; // YYYY-MM-DD
  /** İhale usulü */
  procedureType: ProcedureType;
  /** İhale türü */
  tenderType: TenderType;
  /** Yaklaşık maliyet eşik değeri aşıyor mu? */
  aboveThreshold: boolean;
  /** Zeyilname var mı? */
  hasAddendum?: boolean;
  /** Zeyilname tarihi */
  addendumDate?: string;
}

export interface DeadlineResult {
  /** Son teklif tarihi */
  submissionDeadline: Date;
  /** Minimum süre (takvim günü) */
  minimumDays: number;
  /** Yasal dayanak */
  legalBasis: string;
  /** Açıklama */
  explanation: string;
  /** Tatil günleri (süre içindeki) */
  holidaysInRange: Holiday[];
  /** Zeyilname uzatma süresi */
  addendumExtension?: number;
  /** İş günü hesabı */
  workingDays: number;
}

export type ProcedureType =
  | "ACIK_IHALE"          // Açık İhale Usulü
  | "BELLI_ISTEKLILER"    // Belli İstekliler Arasında
  | "PAZARLIK"            // Pazarlık Usulü
  | "DOGRUDAN_TEMIN";     // Doğrudan Temin

export type TenderType =
  | "YAPIM"               // Yapım İşi
  | "MAL_ALIMI"           // Mal Alımı
  | "HIZMET"              // Hizmet Alımı
  | "DANISMANLIK";        // Danışmanlık

export interface Holiday {
  date: Date;
  name: string;
  type: "RESMI_TATIL" | "DINI_BAYRAM" | "MILLI_BAYRAM" | "OZEL";
}

// ─── Turkish Official Holidays ────────────────────────────────
// Fetched from Calendarific/Holiday API (no hardcoded religious dates)
// API handles Islamic holiday date shifts automatically

async function getOfficialHolidays(year: number): Promise<Holiday[]> {
  try {
    const apiHolidays = await fetchHolidaysFromApi(year);
    return apiHolidays.map((h) => ({
      date: new Date(h.date),
      name: h.name,
      type: h.type,
    }));
  } catch (err) {
    console.warn(`Tatil API'si başarısız (${year}), sabit tatiller kullanılıyor:`, err);
    // Fallback: only fixed national holidays (no religious dates without API)
    return [
      { date: new Date(year, 0, 1), name: "Yılbaşı", type: "RESMI_TATIL" },
      { date: new Date(year, 3, 23), name: "Ulusal Egemenlik ve Çocuk Bayramı", type: "MILLI_BAYRAM" },
      { date: new Date(year, 4, 1), name: "Emek ve Dayanışma Günü", type: "RESMI_TATIL" },
      { date: new Date(year, 4, 19), name: "Atatürk'ü Anma, Gençlik ve Spor Bayramı", type: "MILLI_BAYRAM" },
      { date: new Date(year, 6, 15), name: "Demokrasi ve Millî Birlik Günü", type: "MILLI_BAYRAM" },
      { date: new Date(year, 7, 30), name: "Zafer Bayramı", type: "MILLI_BAYRAM" },
      { date: new Date(year, 9, 28), name: "Cumhuriyet Bayramı (Yarım gün)", type: "MILLI_BAYRAM" },
      { date: new Date(year, 9, 29), name: "Cumhuriyet Bayramı", type: "MILLI_BAYRAM" },
    ];
  }
}

// ─── Minimum Days by Procedure (4734 Madde 13) ──────────────

function getMinimumDays(
  procedureType: ProcedureType,
  tenderType: TenderType,
  aboveThreshold: boolean,
): { days: number; legalBasis: string; explanation: string } {
  switch (procedureType) {
    case "ACIK_IHALE":
      if (aboveThreshold) {
        // Eşik değer üstü — Madde 13/a
        if (tenderType === "YAPIM") {
          return {
            days: 40,
            legalBasis: "4734 sayılı Kanun Madde 13/a-1",
            explanation: "Eşik değer üstü yapım işi açık ihale: en az 40 takvim günü",
          };
        }
        return {
          days: 40,
          legalBasis: "4734 sayılı Kanun Madde 13/a-1",
          explanation: "Eşik değer üstü mal/hizmet açık ihale: en az 40 takvim günü",
        };
      }
      // Eşik değer altı — Madde 13/b
      if (tenderType === "YAPIM") {
        return {
          days: 14,
          legalBasis: "4734 sayılı Kanun Madde 13/b-1",
          explanation: "Eşik değer altı yapım işi açık ihale: en az 14 takvim günü",
        };
      }
      return {
        days: 7,
        legalBasis: "4734 sayılı Kanun Madde 13/b-2",
        explanation: "Eşik değer altı mal/hizmet açık ihale: en az 7 takvim günü",
      };

    case "BELLI_ISTEKLILER":
      if (aboveThreshold) {
        return {
          days: 40,
          legalBasis: "4734 sayılı Kanun Madde 13/a-2",
          explanation: "Eşik değer üstü belli istekliler arasında: ön yeterlik en az 14 gün, teklif en az 40 gün",
        };
      }
      return {
        days: 14,
        legalBasis: "4734 sayılı Kanun Madde 13/b-3",
        explanation: "Eşik değer altı belli istekliler arasında: en az 14 takvim günü",
      };

    case "PAZARLIK":
      return {
        days: 10,
        legalBasis: "4734 sayılı Kanun Madde 13/c",
        explanation: "Pazarlık usulü: en az 10 takvim günü (ön yeterlik için)",
      };

    case "DOGRUDAN_TEMIN":
      return {
        days: 0,
        legalBasis: "4734 sayılı Kanun Madde 22",
        explanation: "Doğrudan temin: süre şartı yok, piyasa araştırması yeterli",
      };
  }
}

// ─── Core Calculator ────────────────────────────────────────

export async function calculateDeadline(input: DeadlineInput): Promise<DeadlineResult> {
  const announcementDate = new Date(input.announcementDate);
  const { days: minimumDays, legalBasis, explanation } = getMinimumDays(
    input.procedureType,
    input.tenderType,
    input.aboveThreshold,
  );

  // Collect holidays for the relevant year(s) from API
  const year = announcementDate.getFullYear();
  const allHolidays = [
    ...(await getOfficialHolidays(year)),
    ...(await getOfficialHolidays(year + 1)),
  ];

  // Calculate submission deadline
  let deadline = new Date(announcementDate);
  deadline.setDate(deadline.getDate() + minimumDays);

  // If deadline falls on weekend or holiday, move to next working day
  deadline = adjustToWorkingDay(deadline, allHolidays);

  // Zeyilname (addendum) extension: 4734 Madde 29
  let addendumExtension: number | undefined;
  if (input.hasAddendum && input.addendumDate) {
    const addDate = new Date(input.addendumDate);
    const daysToDeadline = Math.ceil(
      (deadline.getTime() - addDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Son teklif tarihine 10 günden az kaldıysa en az 10 gün uzatılır
    if (daysToDeadline < 10) {
      addendumExtension = 10 - daysToDeadline;
      deadline.setDate(deadline.getDate() + addendumExtension);
      deadline = adjustToWorkingDay(deadline, allHolidays);
    }
  }

  // Count holidays in range
  const holidaysInRange = allHolidays.filter((h) => {
    return h.date >= announcementDate && h.date <= deadline;
  });

  // Count working days
  const workingDays = countWorkingDays(announcementDate, deadline, allHolidays);

  return {
    submissionDeadline: deadline,
    minimumDays,
    legalBasis,
    explanation,
    holidaysInRange,
    addendumExtension,
    workingDays,
  };
}

// ─── Working Day Utilities ──────────────────────────────────

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
}

function isHoliday(date: Date, holidays: Holiday[]): boolean {
  return holidays.some((h) => isSameDay(h.date, date));
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function adjustToWorkingDay(date: Date, holidays: Holiday[]): Date {
  const result = new Date(date);
  let maxIterations = 30;
  while ((isWeekend(result) || isHoliday(result, holidays)) && maxIterations > 0) {
    result.setDate(result.getDate() + 1);
    maxIterations--;
  }
  return result;
}

function countWorkingDays(start: Date, end: Date, holidays: Holiday[]): number {
  let count = 0;
  const current = new Date(start);
  current.setDate(current.getDate() + 1); // Exclude start date

  while (current <= end) {
    if (!isWeekend(current) && !isHoliday(current, holidays)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

// ─── Next working day from today ────────────────────────────

export async function getNextWorkingDay(from?: Date): Promise<Date> {
  const date = from ? new Date(from) : new Date();
  date.setDate(date.getDate() + 1);
  const holidays = await getOfficialHolidays(date.getFullYear());
  return adjustToWorkingDay(date, holidays);
}

// ─── Get holidays for a date range ──────────────────────────

export async function getHolidaysInRange(startStr: string, endStr: string): Promise<Holiday[]> {
  const start = new Date(startStr);
  const end = new Date(endStr);
  const years = new Set<number>();
  const current = new Date(start);

  while (current <= end) {
    years.add(current.getFullYear());
    current.setFullYear(current.getFullYear() + 1);
  }

  const allHolidays: Holiday[] = [];
  for (const y of years) {
    allHolidays.push(...(await getOfficialHolidays(y)));
  }

  return allHolidays.filter((h) => h.date >= start && h.date <= end);
}

// ─── Commonly used deadline scenarios ───────────────────────

export async function getCommonScenarios(announcementDate: string) {
  const scenarios = [
    {
      label: "Açık İhale — Yapım (eşik üstü)",
      result: await calculateDeadline({
        announcementDate,
        procedureType: "ACIK_IHALE",
        tenderType: "YAPIM",
        aboveThreshold: true,
      }),
    },
    {
      label: "Açık İhale — Yapım (eşik altı)",
      result: await calculateDeadline({
        announcementDate,
        procedureType: "ACIK_IHALE",
        tenderType: "YAPIM",
        aboveThreshold: false,
      }),
    },
    {
      label: "Açık İhale — Mal/Hizmet (eşik üstü)",
      result: await calculateDeadline({
        announcementDate,
        procedureType: "ACIK_IHALE",
        tenderType: "MAL_ALIMI",
        aboveThreshold: true,
      }),
    },
    {
      label: "Açık İhale — Mal/Hizmet (eşik altı)",
      result: await calculateDeadline({
        announcementDate,
        procedureType: "ACIK_IHALE",
        tenderType: "MAL_ALIMI",
        aboveThreshold: false,
      }),
    },
    {
      label: "Pazarlık Usulü",
      result: await calculateDeadline({
        announcementDate,
        procedureType: "PAZARLIK",
        tenderType: "HIZMET",
        aboveThreshold: false,
      }),
    },
  ];

  return scenarios;
}
