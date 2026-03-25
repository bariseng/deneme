export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount == null) return "0,00 \u20BA";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "0,00 \u20BA";
  return (
    num.toLocaleString("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " \u20BA"
  );
}

export function formatCurrencyShort(amount: number | string | null | undefined): string {
  if (amount == null) return "0 \u20BA";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "0 \u20BA";

  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(1).replace(".", ",") + " Milyar \u20BA";
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(".", ",") + " Milyon \u20BA";
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(0) + " Bin \u20BA";
  }
  return num.toLocaleString("tr-TR") + " \u20BA";
}
