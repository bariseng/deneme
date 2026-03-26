import { ProviderCache } from "./cache";

// --- Interfaces ---

export interface VknVerifyResult {
  readonly valid: boolean;
  readonly companyName?: string;
  readonly taxOffice?: string;
  readonly status?: string;
}

// --- Constants ---

const GIB_URL = "https://ivd.gib.gov.tr/tvd_server/asyn-inquiry";
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const RATE_LIMIT_MS = 2000;

const DEFAULT_HEADERS: Readonly<Record<string, string>> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Content-Type": "application/x-www-form-urlencoded",
  Accept: "text/html",
};

// --- Checksum algorithm ---

function computeVknChecksum(digits: readonly number[]): number {
  let sum = 0;

  for (let i = 0; i < 9; i++) {
    const digit = digits[i]!;
    const offset = 9 - i;
    const tmp = (digit + offset) % 10;
    const power = Math.pow(2, offset);
    const modResult = (tmp * power) % 9;
    sum += modResult === 0 ? 9 : modResult;
  }

  return (10 - (sum % 10)) % 10;
}

function isValidVknFormat(vkn: string): boolean {
  return /^\d{10}$/.test(vkn);
}

// --- HTML parsing for GIB response ---

function extractGibField(html: string, label: string): string {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(
      `${escapedLabel}[^<]*</(?:td|th|label|span)>\s*<(?:td|span|div)[^>]*>([^<]+)<`,
      "i"
    ),
    new RegExp(`${escapedLabel}[\s\S]*?<[^>]+>([^<]+)<`, "i"),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return "";
}

function parseGibResponse(html: string): {
  found: boolean;
  companyName: string;
  taxOffice: string;
  status: string;
} {
  const companyName =
    extractGibField(html, "Unvan") ||
    extractGibField(html, "Adı Soyadı") ||
    extractGibField(html, "Mükellef");

  const taxOffice =
    extractGibField(html, "Vergi Dairesi") ||
    extractGibField(html, "VD");

  const status =
    extractGibField(html, "Durum") ||
    extractGibField(html, "Mükellefiyet");

  const found = companyName.length > 0;

  return { found, companyName, taxOffice, status };
}

// --- Rate limiter (simple, internal) ---

let lastRequestTime = 0;

async function acquireRateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;

  if (elapsed < RATE_LIMIT_MS) {
    const waitMs = RATE_LIMIT_MS - elapsed;
    await new Promise<void>((resolve) => {
      setTimeout(resolve, waitMs);
    });
  }

  lastRequestTime = Date.now();
}

// --- Provider class ---

class VknProvider {
  private readonly cache: ProviderCache;

  constructor() {
    this.cache = new ProviderCache("vkn", CACHE_TTL_MS);
  }

  validateChecksum(vkn: string): boolean {
    const trimmed = vkn.trim();

    if (!isValidVknFormat(trimmed)) {
      return false;
    }

    const digits = trimmed.split("").map(Number);
    const expectedCheck = computeVknChecksum(digits);

    return expectedCheck === digits[9];
  }

  async verifyOnline(vkn: string): Promise<VknVerifyResult> {
    const trimmed = vkn.trim();

    if (!isValidVknFormat(trimmed)) {
      return { valid: false };
    }

    // Client-side checksum first
    if (!this.validateChecksum(trimmed)) {
      return { valid: false };
    }

    const cacheKey = `verify:${trimmed}`;
    const cached = await this.cache.get<VknVerifyResult>(cacheKey);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    try {
      await acquireRateLimit();

      const response = await fetch(GIB_URL, {
        method: "POST",
        headers: DEFAULT_HEADERS,
        body: new URLSearchParams({ vkn1: trimmed }).toString(),
      });

      if (!response.ok) {
        // Online check failed — return checksum-only result
        return this.buildChecksumOnlyResult(trimmed);
      }

      const html = await response.text();
      const parsed = parseGibResponse(html);

      if (!parsed.found) {
        const result: VknVerifyResult = { valid: false };
        this.cache.set(cacheKey, result);
        return result;
      }

      const result: VknVerifyResult = {
        valid: true,
        companyName: parsed.companyName || undefined,
        taxOffice: parsed.taxOffice || undefined,
        status: parsed.status || undefined,
      };

      this.cache.set(cacheKey, result);
      return result;
    } catch {
      // Online check failed — return checksum-only result
      return this.buildChecksumOnlyResult(trimmed);
    }
  }

  // --- Private helpers ---

  private buildChecksumOnlyResult(vkn: string): VknVerifyResult {
    const checksumValid = this.validateChecksum(vkn);
    return {
      valid: checksumValid,
      status: checksumValid ? "checksum-only" : undefined,
    };
  }
}

// --- Singleton export ---

export const vknProvider = new VknProvider();
