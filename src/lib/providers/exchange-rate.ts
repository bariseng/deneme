// ─── Exchange Rate Service (TCMB + fallback) ───────────────

import { ProviderCache } from "./cache";

interface ExchangeRates {
  base: string;
  date: string;
  rates: Record<string, number>;
}

const cache = new ProviderCache();
const CACHE_KEY = "exchange:rates:TRY";
const CACHE_TTL = 14400; // 4 hours

/**
 * Fetch live exchange rates from TCMB XML feed, with
 * exchangerate-api.com as fallback. All rates are TRY-based.
 */
export async function getExchangeRates(): Promise<ExchangeRates> {
  // Check cache first
  const cached = await cache.get<ExchangeRates>(CACHE_KEY);
  if (cached) return cached;

  // Try TCMB first
  let rates = await fetchFromTcmb();

  // Fallback to exchangerate-api
  if (!rates) {
    rates = await fetchFromExchangeRateApi();
  }

  // Last resort: return empty with TRY=1
  if (!rates) {
    rates = {
      base: "TRY",
      date: new Date().toISOString().split("T")[0],
      rates: { TRY: 1 },
    };
  }

  await cache.set(CACHE_KEY, rates, {
    ttl: CACHE_TTL,
    staleWhileRevalidate: true,
    key: CACHE_KEY,
  }, "EXCHANGE");

  return rates;
}

/** TCMB daily XML endpoint → parse exchange rates */
async function fetchFromTcmb(): Promise<ExchangeRates | null> {
  try {
    const url =
      process.env.TCMB_EXCHANGE_URL ||
      "https://www.tcmb.gov.tr/kurlar/today.xml";

    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": "IhalePro/1.0" },
    });

    if (!res.ok) return null;
    const xml = await res.text();

    const rates: Record<string, number> = { TRY: 1 };
    // Parse XML with regex (no dependency needed for simple TCMB format)
    // TCMB format: <Currency CurrencyCode="USD"><ForexBuying>38.1234</ForexBuying>...
    const currencyBlocks = xml.match(
      /<Currency[^>]*CurrencyCode="([^"]+)"[^>]*>[\s\S]*?<\/Currency>/g,
    );

    if (!currencyBlocks) return null;

    for (const block of currencyBlocks) {
      const codeMatch = block.match(/CurrencyCode="([^"]+)"/);
      const buyingMatch = block.match(
        /<ForexBuying>([\d.]+)<\/ForexBuying>/,
      );
      if (codeMatch && buyingMatch) {
        const code = codeMatch[1];
        const rate = parseFloat(buyingMatch[1]);
        if (rate > 0) {
          rates[code] = rate; // 1 USD = X TRY
        }
      }
    }

    return {
      base: "TRY",
      date: new Date().toISOString().split("T")[0],
      rates,
    };
  } catch {
    return null;
  }
}

/** exchangerate-api.com free tier fallback */
async function fetchFromExchangeRateApi(): Promise<ExchangeRates | null> {
  try {
    const url = "https://open.er-api.com/v6/latest/TRY";
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      result: string;
      rates: Record<string, number>;
    };
    if (data.result !== "success") return null;

    // Invert rates: API gives 1 TRY = X currency, we need 1 currency = X TRY
    const rates: Record<string, number> = { TRY: 1 };
    for (const [code, rate] of Object.entries(data.rates)) {
      if (rate > 0) {
        rates[code] = 1 / rate;
      }
    }

    return {
      base: "TRY",
      date: new Date().toISOString().split("T")[0],
      rates,
    };
  } catch {
    return null;
  }
}

/** Convert amount from one currency to TRY */
export async function convertToTry(
  amount: number,
  fromCurrency: string,
): Promise<number> {
  if (fromCurrency === "TRY") return amount;

  const { rates } = await getExchangeRates();
  const rate = rates[fromCurrency];
  if (!rate) {
    throw new Error(`Exchange rate not found for ${fromCurrency}`);
  }
  return amount * rate;
}

/** Format amount with currency symbol */
export function formatCurrency(
  amount: number,
  currency: string,
): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
