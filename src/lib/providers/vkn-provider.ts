// ─── VKN (Vergi Kimlik Numarası) Validation Provider ────────

import { RateLimiter } from "./rate-limiter";
import { ProviderCache } from "./cache";
import { CircuitBreaker, withRetry } from "./error-handler";
import type { ProviderConfig, HealthCheckResult } from "./types";

// ─── Types ──────────────────────────────────────────────────

export interface VknResult {
  valid: boolean;
  companyName?: string;
  taxOffice?: string;
  status?: string;
}

interface GibApiResponse {
  tpiTcknVknSorgulaDto?: {
    unvan?: string;
    vergidairesikodu?: string;
    durum?: string;
  };
}

// ─── VKN Checksum Algorithm ─────────────────────────────────

/**
 * Validates a Turkish tax ID (VKN) using the official checksum algorithm.
 * The VKN is 10 digits where the 10th digit is the check digit.
 */
export function validateVknChecksum(vkn: string): boolean {
  if (!/^\d{10}$/.test(vkn)) return false;

  const digits = vkn.split("").map(Number);

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    const tmp = (digits[i] + (9 - i)) % 10;
    const powered = Math.pow(2, 9 - i) * tmp;
    const mod9 = powered % 9;
    // When powered > 0 and mod9 === 0, the contribution is 9; otherwise mod9
    sum += powered > 0 && mod9 === 0 ? 9 : mod9;
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === digits[9];
}

// ─── Provider Configuration ─────────────────────────────────

const VKN_CONFIG: ProviderConfig = {
  name: "VKN",
  baseUrl: "https://ivd.gib.gov.tr",
  rateLimitMs: 1000,
  maxTokens: 3,
  cache: { ttl: 86400, staleWhileRevalidate: true, key: "vkn" },
  maxRetries: 2,
  baseDelayMs: 500,
  circuitBreakerThreshold: 5,
  circuitBreakerResetMs: 60_000,
};

// ─── Provider Class ─────────────────────────────────────────

class VknProvider {
  private readonly rateLimiter: RateLimiter;
  private readonly cache: ProviderCache;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly config: ProviderConfig;

  constructor() {
    this.config = VKN_CONFIG;
    this.rateLimiter = new RateLimiter({
      maxTokens: this.config.maxTokens,
      refillIntervalMs: this.config.rateLimitMs,
      tokensPerInterval: 1,
    });
    this.cache = new ProviderCache();
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: this.config.circuitBreakerThreshold,
      resetTimeoutMs: this.config.circuitBreakerResetMs,
      cache: this.cache,
    });
  }

  /**
   * Verify a VKN online: first validates the checksum, then queries GİB.
   */
  async verifyVkn(vkn: string): Promise<VknResult> {
    if (!validateVknChecksum(vkn)) {
      return { valid: false, status: "INVALID_CHECKSUM" };
    }

    const cacheKey = `vkn:verify:${vkn}`;
    const cached = await this.cache.get<VknResult>(cacheKey);
    if (cached) return cached;

    await this.rateLimiter.acquire();

    const result = await this.circuitBreaker.execute(() =>
      withRetry(() => this.fetchVknData(vkn), {
        maxRetries: this.config.maxRetries,
        baseDelayMs: this.config.baseDelayMs,
      }),
    );

    await this.cache.set(cacheKey, result, this.config.cache, this.config.name);
    return result;
  }

  private async fetchVknData(vkn: string): Promise<VknResult> {
    const response = await fetch(
      `${this.config.baseUrl}/tvd_server/asempService`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vkn }),
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (!response.ok) {
      throw new Error(`GİB API returned status ${response.status}`);
    }

    const data: unknown = await response.json();
    const typed = data as GibApiResponse;
    const dto = typed.tpiTcknVknSorgulaDto;

    if (!dto) {
      return { valid: false, status: "NOT_FOUND" };
    }

    return {
      valid: true,
      companyName: dto.unvan,
      taxOffice: dto.vergidairesikodu,
      status: dto.durum ?? "ACTIVE",
    };
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const res = await fetch(this.config.baseUrl, {
        method: "HEAD",
        signal: AbortSignal.timeout(5_000),
      });
      return { ok: res.ok, latencyMs: Date.now() - start };
    } catch {
      return { ok: false, latencyMs: Date.now() - start };
    }
  }
}

// ─── Singleton & Exports ────────────────────────────────────

const vknProviderInstance = new VknProvider();

export const vknProvider = vknProviderInstance;
export const verifyVkn = (vkn: string) => vknProviderInstance.verifyVkn(vkn);
