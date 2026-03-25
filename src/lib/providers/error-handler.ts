// ─── Error Handling: Retry + Circuit Breaker ────────────────

import { ProviderCache } from "./cache";

// ─── Retry with Exponential Backoff ─────────────────────────

export interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  /** Optional maximum delay cap in ms */
  maxDelayMs?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a function with retry logic using exponential backoff.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const { maxRetries, baseDelayMs, maxDelayMs = 30_000 } = options;
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        const delay = Math.min(
          baseDelayMs * Math.pow(2, attempt) + Math.random() * baseDelayMs,
          maxDelayMs,
        );
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

// ─── Circuit Breaker ────────────────────────────────────────

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeoutMs: number;
  /** Optional cache instance for fallback */
  cache?: ProviderCache;
  /** Cache key to use when falling back */
  fallbackCacheKey?: string;
}

export class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly cache?: ProviderCache;
  private readonly fallbackCacheKey?: string;

  constructor(options: CircuitBreakerOptions) {
    this.failureThreshold = options.failureThreshold;
    this.resetTimeoutMs = options.resetTimeoutMs;
    this.cache = options.cache;
    this.fallbackCacheKey = options.fallbackCacheKey;
  }

  getState(): CircuitState {
    if (this.state === "OPEN") {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed >= this.resetTimeoutMs) {
        this.state = "HALF_OPEN";
      }
    }
    return this.state;
  }

  /**
   * Execute a function through the circuit breaker.
   * Falls back to cache when the circuit is open if configured.
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const currentState = this.getState();

    if (currentState === "OPEN") {
      return this.handleOpenState<T>();
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();

      // Attempt cache fallback on failure
      if (this.cache && this.fallbackCacheKey) {
        const cached = await this.cache.get<T>(this.fallbackCacheKey);
        if (cached !== null) return cached;
      }

      throw error;
    }
  }

  private async handleOpenState<T>(): Promise<T> {
    // Try cache fallback
    if (this.cache && this.fallbackCacheKey) {
      const cached = await this.cache.get<T>(this.fallbackCacheKey);
      if (cached !== null) return cached;
    }
    throw new Error("Circuit breaker is OPEN and no cached fallback available");
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = "CLOSED";
  }

  private onFailure(): void {
    this.failureCount += 1;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.failureThreshold) {
      this.state = "OPEN";
    }
  }
}
