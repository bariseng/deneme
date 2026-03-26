// ─── EKAP Tender Data Validator ─────────────────────────────
// Format validation, duplicate detection, logical checks

import { Prisma } from "@/generated/prisma/client";

// ─── Types ──────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface TenderInput {
  title?: string | null;
  institution?: string | null;
  city?: string | null;
  deadline?: Date | string | null;
  estimatedCost?: Prisma.Decimal | number | null;
  status?: string | null;
  tenderType?: string | null;
  source?: string | null;
  ekapNo?: string | null;
}

// ─── Constants ──────────────────────────────────────────────

const VALID_STATUSES = ["BASVURU_ACIK", "DEGERLENDIRME", "SONUCLANDI", "IPTAL", "YAKLASAN"];
const VALID_TYPES = ["YAPIM", "MAL_ALIMI", "HIZMET", "DANISMANLIK"];
const VALID_SOURCES = ["EKAP", "TED", "MANUAL", "MOCK"];

const TR_CITIES = [
  "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Aksaray", "Amasya",
  "Ankara", "Antalya", "Artvin", "Aydın", "Balıkesir", "Bartın",
  "Batman", "Bayburt", "Bilecik", "Bingöl", "Bitlis", "Bolu",
  "Burdur", "Bursa", "Çanakkale", "Çankırı", "Çorum", "Denizli",
  "Diyarbakır", "Düzce", "Edirne", "Elazığ", "Erzincan", "Erzurum",
  "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane", "Hakkari", "Hatay",
  "Iğdır", "Isparta", "İstanbul", "İzmir", "Kahramanmaraş", "Karabük",
  "Karaman", "Kars", "Kastamonu", "Kayseri", "Kırıkkale", "Kırklareli",
  "Kırşehir", "Kilis", "Kocaeli", "Konya", "Kütahya", "Malatya",
  "Manisa", "Mardin", "Mersin", "Muğla", "Muş", "Nevşehir",
  "Niğde", "Ordu", "Osmaniye", "Rize", "Sakarya", "Samsun",
  "Şanlıurfa", "Siirt", "Sinop", "Sivas", "Şırnak", "Tekirdağ",
  "Tokat", "Trabzon", "Tunceli", "Uşak", "Van", "Yalova",
  "Yozgat", "Zonguldak",
];

// ─── Tender Validation ──────────────────────────────────────

export function validateTender(tender: TenderInput): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!tender.title || tender.title.trim().length < 5) {
    errors.push("İhale başlığı en az 5 karakter olmalı");
  }
  if (!tender.institution || tender.institution.trim().length < 3) {
    errors.push("Kurum adı en az 3 karakter olmalı");
  }
  if (!tender.city) {
    errors.push("Şehir bilgisi gerekli");
  }

  // City validation
  if (tender.city && !TR_CITIES.includes(tender.city)) {
    warnings.push(`Geçersiz şehir: ${tender.city}`);
  }

  // Status validation
  if (tender.status && !VALID_STATUSES.includes(tender.status)) {
    errors.push(`Geçersiz durum: ${tender.status}. Geçerli: ${VALID_STATUSES.join(", ")}`);
  }

  // Type validation
  if (tender.tenderType && !VALID_TYPES.includes(tender.tenderType)) {
    errors.push(`Geçersiz ihale türü: ${tender.tenderType}`);
  }

  // Source validation
  if (tender.source && !VALID_SOURCES.includes(tender.source)) {
    warnings.push(`Bilinmeyen kaynak: ${tender.source}`);
  }

  // Cost validation
  if (tender.estimatedCost !== null && tender.estimatedCost !== undefined) {
    const cost = Number(tender.estimatedCost);
    if (isNaN(cost) || cost < 0) {
      errors.push("Tahmini maliyet negatif olamaz");
    }
    if (cost > 100_000_000_000) { // 100 billion TRY sanity check
      warnings.push("Tahmini maliyet çok yüksek: " + cost.toLocaleString("tr-TR"));
    }
  }

  // Deadline validation
  if (tender.deadline) {
    const deadline = new Date(tender.deadline);
    if (isNaN(deadline.getTime())) {
      errors.push("Geçersiz son başvuru tarihi");
    }
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    if (deadline < fiveYearsAgo) {
      warnings.push("Son başvuru tarihi 5 yıldan eski");
    }
  }

  // EKAP no format
  if (tender.ekapNo && !/^\d{4,}$/.test(tender.ekapNo)) {
    warnings.push(`Geçersiz EKAP numarası formatı: ${tender.ekapNo}`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ─── Batch Validation ───────────────────────────────────────

export function validateTenderBatch(tenders: TenderInput[]): {
  validCount: number;
  invalidCount: number;
  warningCount: number;
  results: Array<{ index: number; result: ValidationResult }>;
} {
  let validCount = 0;
  let invalidCount = 0;
  let warningCount = 0;
  const results: Array<{ index: number; result: ValidationResult }> = [];

  for (let i = 0; i < tenders.length; i++) {
    const result = validateTender(tenders[i]);
    if (result.valid) validCount++;
    else invalidCount++;
    if (result.warnings.length > 0) warningCount++;
    if (!result.valid || result.warnings.length > 0) {
      results.push({ index: i, result });
    }
  }

  return { validCount, invalidCount, warningCount, results };
}

// ─── Duplicate Detection ────────────────────────────────────

export function detectDuplicates(
  tenders: Array<{ ekapNo?: string | null; title?: string | null; institution?: string | null }>,
): Array<{ indices: number[]; reason: string }> {
  const duplicates: Array<{ indices: number[]; reason: string }> = [];

  // By EKAP number
  const ekapMap = new Map<string, number[]>();
  for (let i = 0; i < tenders.length; i++) {
    const no = tenders[i].ekapNo;
    if (!no) continue;
    const existing = ekapMap.get(no) || [];
    existing.push(i);
    ekapMap.set(no, existing);
  }
  for (const [no, indices] of ekapMap) {
    if (indices.length > 1) {
      duplicates.push({ indices, reason: `Aynı EKAP numarası: ${no}` });
    }
  }

  // By title + institution (fuzzy)
  const titleMap = new Map<string, number[]>();
  for (let i = 0; i < tenders.length; i++) {
    const key = `${(tenders[i].title || "").toLowerCase().trim()}|${(tenders[i].institution || "").toLowerCase().trim()}`;
    const existing = titleMap.get(key) || [];
    existing.push(i);
    titleMap.set(key, existing);
  }
  for (const [, indices] of titleMap) {
    if (indices.length > 1) {
      duplicates.push({ indices, reason: "Aynı başlık ve kurum" });
    }
  }

  return duplicates;
}
