// ─── External Data Provider Infrastructure ──────────────────

export * from "./types";
export { RateLimiter } from "./rate-limiter";
export { ProviderCache } from "./cache";
export { withRetry, CircuitBreaker } from "./error-handler";
export type { RetryOptions, CircuitState, CircuitBreakerOptions } from "./error-handler";

// ─── Base Provider ──────────────────────────────────────────

import { prisma } from "@/lib/prisma";
import type { DataProvider, ProviderConfig, SyncResult, CacheConfig, HealthCheckResult } from "./types";
import { RateLimiter } from "./rate-limiter";
import { ProviderCache } from "./cache";
import { withRetry, CircuitBreaker } from "./error-handler";

export abstract class BaseProvider<T> implements DataProvider<T> {
  protected readonly config: ProviderConfig;
  protected readonly rateLimiter: RateLimiter;
  protected readonly cache: ProviderCache;
  protected readonly circuitBreaker: CircuitBreaker;

  constructor(config: ProviderConfig) {
    this.config = config;

    this.rateLimiter = new RateLimiter({
      maxTokens: config.maxTokens,
      refillIntervalMs: config.rateLimitMs,
      tokensPerInterval: 1,
    });

    this.cache = new ProviderCache();

    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: config.circuitBreakerThreshold,
      resetTimeoutMs: config.circuitBreakerResetMs,
      cache: this.cache,
    });
  }

  /**
   * Subclasses must implement the raw fetch logic (no caching / rate-limiting).
   */
  protected abstract doFetch(params: Record<string, unknown>): Promise<T[]>;

  /**
   * Subclasses must implement the raw fetchById logic.
   */
  protected abstract doFetchById(id: string): Promise<T | null>;

  /**
   * Subclasses must implement a health check for the external service.
   */
  abstract healthCheck(): Promise<HealthCheckResult>;

  // ── Public API ──────────────────────────────────────────────

  async fetch(params: Record<string, unknown>): Promise<T[]> {
    const cacheKey = this.buildCacheKey("fetch", params);

    // Try cache first
    const cached = await this.cache.get<T[]>(cacheKey);
    if (cached !== null) return cached;

    // Acquire rate-limit token
    await this.rateLimiter.acquire();

    // Execute through circuit breaker + retry
    const result = await this.circuitBreaker.execute(() =>
      withRetry(() => this.doFetch(params), {
        maxRetries: this.config.maxRetries,
        baseDelayMs: this.config.baseDelayMs,
      }),
    );

    // Store in cache
    await this.cache.set(cacheKey, result, this.cacheConfig, this.config.name);

    return result;
  }

  async fetchById(id: string): Promise<T | null> {
    const cacheKey = this.buildCacheKey("fetchById", { id });

    const cached = await this.cache.get<T | null>(cacheKey);
    if (cached !== null) return cached;

    await this.rateLimiter.acquire();

    const result = await this.circuitBreaker.execute(() =>
      withRetry(() => this.doFetchById(id), {
        maxRetries: this.config.maxRetries,
        baseDelayMs: this.config.baseDelayMs,
      }),
    );

    if (result !== null) {
      await this.cache.set(cacheKey, result, this.cacheConfig, this.config.name);
    }

    return result;
  }

  // ── Sync Logging ────────────────────────────────────────────

  protected async logSync(
    operation: string,
    fn: () => Promise<number>,
  ): Promise<SyncResult> {
    const startedAt = new Date();

    const log = await prisma.dataSyncLog.create({
      data: {
        provider: this.config.name,
        operation,
        status: "RUNNING",
        startedAt,
      },
    });

    try {
      const recordCount = await fn();

      await prisma.dataSyncLog.update({
        where: { id: log.id },
        data: {
          status: "COMPLETED",
          recordCount,
          completedAt: new Date(),
        },
      });

      return {
        provider: this.config.name,
        operation,
        status: "COMPLETED",
        recordCount,
        startedAt,
        completedAt: new Date(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      await prisma.dataSyncLog.update({
        where: { id: log.id },
        data: {
          status: "FAILED",
          errorMessage,
          completedAt: new Date(),
        },
      });

      return {
        provider: this.config.name,
        operation,
        status: "FAILED",
        recordCount: 0,
        errorMessage,
        startedAt,
        completedAt: new Date(),
      };
    }
  }

  // ── Helpers ─────────────────────────────────────────────────

  private get cacheConfig(): CacheConfig {
    return this.config.cache;
  }

  private buildCacheKey(
    method: string,
    params: Record<string, unknown>,
  ): string {
    const paramStr = JSON.stringify(params, Object.keys(params).sort());
    return `${this.config.name}:${method}:${paramStr}`;
  }
}
