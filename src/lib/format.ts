/** Format a number to Turkish Lira display: 1.234.567 ₺ */
export function formatCurrency(value: number): string {
  return (
    value.toLocaleString("tr-TR", { maximumFractionDigits: 0 }) + " ₺"
  );
}

/** Format a date string (YYYY-MM-DD) to Turkish format: DD.MM.YYYY */
export function formatDateTR(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Parse Turkish cost string to number: "2.450.000.000 ₺" → 2450000000 */
export function parseCostString(cost: string): number {
  return parseFloat(cost.replace(/[^0-9]/g, "")) || 0;
}
