// ─── Validators barrel export ───────────────────────────────

export { validateTender, validateTenderBatch, detectDuplicates } from "./tender-validator";
export type { ValidationResult } from "./tender-validator";
export { validateCompany, validateVkn, validateTckn } from "./company-validator";
export { validatePriceIndex, validatePriceBatch } from "./price-validator";
