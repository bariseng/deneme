// ─── Price Index Validator ───────────────────────────────────
// Logical checks for price data from TÜİK/CSB providers

import type { ValidationResult } from "./tender-validator";

interface PriceInput {
  sector?: string | null;
  item?: string | null;
  unit?: string | null;
  price?: number | null;
  prevPrice?: number | null;
  change?: number | null;
  month?: string | Date | null;
  source?: string | null;
}

const VALID_UNITS = ["m³", "m²", "m", "ton", "kg", "lt", "adet", "gün", "saat", "kWh", "takım"];
const VALID_SECTORS = ["YAPIM", "HIZMET", "MAL_ALIMI", "DANISMANLIK", "Yapım İşleri", "Bilişim", "Sağlık"];

// ─── Price Validation ───────────────────────────────────────

export function validatePriceIndex(price: PriceInput): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!price.sector) errors.push("Sektör bilgisi gerekli");
  if (!price.item) errors.push("Kalem adı gerekli");
  if (!price.unit) errors.push("Birim bilgisi gerekli");

  // Sector check
  if (price.sector && !VALID_SECTORS.includes(price.sector)) {
    warnings.push(`Bilinmeyen sektör: ${price.sector}`);
  }

  // Unit check
  if (price.unit && !VALID_UNITS.includes(price.unit)) {
    warnings.push(`Bilinmeyen birim: ${price.unit}`);
  }

  // Price validations
  if (price.price === null || price.price === undefined) {
    errors.push("Fiyat bilgisi gerekli");
  } else {
    if (price.price < 0) {
      errors.push("Fiyat negatif olamaz");
    }
    if (price.price === 0) {
      warnings.push("Fiyat sıfır");
    }
    if (price.price > 10_000_000) {
      warnings.push(`Çok yüksek birim fiyat: ${price.price.toLocaleString("tr-TR")} TL`);
    }
  }

  // Previous price and change consistency
  if (price.prevPrice !== null && price.prevPrice !== undefined) {
    if (price.prevPrice < 0) {
      errors.push("Önceki fiyat negatif olamaz");
    }

    if (price.price && price.prevPrice > 0 && price.change !== null && price.change !== undefined) {
      const expectedChange = ((price.price - price.prevPrice) / price.prevPrice) * 100;
      const diff = Math.abs(expectedChange - price.change);
      if (diff > 1) { // 1% tolerance
        warnings.push(
          `Değişim oranı tutarsız: beklenen ${expectedChange.toFixed(1)}%, verilen ${price.change.toFixed(1)}%`,
        );
      }
    }
  }

  // Extreme price change detection
  if (price.change !== null && price.change !== undefined) {
    if (Math.abs(price.change) > 200) {
      warnings.push(`Aşırı fiyat değişimi: %${price.change.toFixed(1)}`);
    }
  }

  // Month validation
  if (price.month) {
    const monthStr = typeof price.month === "string" ? price.month : price.month.toISOString();
    if (typeof price.month === "string" && !/^\d{4}-\d{2}/.test(monthStr)) {
      errors.push("Geçersiz ay formatı (YYYY-MM bekleniyor)");
    }
  } else {
    errors.push("Ay bilgisi gerekli");
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ─── Batch Price Validation ─────────────────────────────────

export function validatePriceBatch(prices: PriceInput[]): {
  validCount: number;
  invalidCount: number;
  warnings: string[];
} {
  let validCount = 0;
  let invalidCount = 0;
  const allWarnings: string[] = [];

  for (const price of prices) {
    const result = validatePriceIndex(price);
    if (result.valid) validCount++;
    else invalidCount++;
    allWarnings.push(...result.warnings);
  }

  return { validCount, invalidCount, warnings: allWarnings };
}
