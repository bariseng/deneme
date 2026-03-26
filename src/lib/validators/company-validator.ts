// ─── Company Data Validator ─────────────────────────────────
// Consistency checks for firm data from MERSİS/KAP

import type { ValidationResult } from "./tender-validator";

interface CompanyInput {
  name?: string | null;
  taxNumber?: string | null;
  city?: string | null;
  sector?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  foundedYear?: number | null;
  employeeCount?: number | null;
  capitalAmount?: number | null;
}

// ─── VKN (Tax Number) Validation ────────────────────────────

export function validateVkn(vkn: string): boolean {
  if (!/^\d{10}$/.test(vkn)) return false;

  // Turkish VKN (Vergi Kimlik Numarası) checksum algorithm
  const digits = vkn.split("").map(Number);
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    const tmp = (digits[i] + (9 - i)) % 10;
    const val = (tmp * Math.pow(2, 9 - i)) % 9;
    sum += val === 0 && tmp !== 0 ? 9 : val;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === digits[9];
}

// ─── TCKN (Identity Number) Validation ──────────────────────

export function validateTckn(tckn: string): boolean {
  if (!/^\d{11}$/.test(tckn)) return false;
  if (tckn[0] === "0") return false;

  const digits = tckn.split("").map(Number);
  const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  const evenSum = digits[1] + digits[3] + digits[5] + digits[7];
  const check10 = (oddSum * 7 - evenSum) % 10;
  if (check10 !== digits[9]) return false;

  const total = digits.slice(0, 10).reduce((a, b) => a + b, 0);
  return total % 10 === digits[10];
}

// ─── Company Validation ─────────────────────────────────────

export function validateCompany(company: CompanyInput): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Name
  if (!company.name || company.name.trim().length < 2) {
    errors.push("Firma adı en az 2 karakter olmalı");
  }

  // Tax number
  if (!company.taxNumber) {
    errors.push("Vergi kimlik numarası gerekli");
  } else if (company.taxNumber.length === 10) {
    if (!validateVkn(company.taxNumber)) {
      errors.push("Geçersiz VKN (Vergi Kimlik Numarası)");
    }
  } else if (company.taxNumber.length === 11) {
    if (!validateTckn(company.taxNumber)) {
      errors.push("Geçersiz TCKN");
    }
  } else {
    errors.push("VKN 10, TCKN 11 haneli olmalı");
  }

  // Email
  if (company.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(company.email)) {
    warnings.push("Geçersiz e-posta formatı");
  }

  // Phone
  if (company.phone) {
    const cleaned = company.phone.replace(/[\s\-()]/g, "");
    if (!/^(0|\+90)?\d{10}$/.test(cleaned)) {
      warnings.push("Geçersiz telefon formatı");
    }
  }

  // Website
  if (company.website && !/^https?:\/\/.+\..+/.test(company.website)) {
    warnings.push("Geçersiz web sitesi URL'si");
  }

  // Founded year
  if (company.foundedYear !== null && company.foundedYear !== undefined) {
    const currentYear = new Date().getFullYear();
    if (company.foundedYear < 1900 || company.foundedYear > currentYear) {
      errors.push(`Kuruluş yılı 1900-${currentYear} arasında olmalı`);
    }
  }

  // Employee count
  if (company.employeeCount !== null && company.employeeCount !== undefined) {
    if (company.employeeCount < 0) {
      errors.push("Çalışan sayısı negatif olamaz");
    }
    if (company.employeeCount > 1_000_000) {
      warnings.push("Çalışan sayısı çok yüksek");
    }
  }

  // Capital
  if (company.capitalAmount !== null && company.capitalAmount !== undefined) {
    if (company.capitalAmount < 0) {
      errors.push("Sermaye tutarı negatif olamaz");
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
