// ─── External Data Provider Types ───────────────────────────

export interface HealthCheckResult {
  ok: boolean;
  latencyMs: number;
}

export interface DataProvider<T> {
  fetch(params: Record<string, unknown>): Promise<T[]>;
  fetchById(id: string): Promise<T | null>;
  healthCheck(): Promise<HealthCheckResult>;
}

/** Default provider configurations (rate limits from real API constraints) */
export const PROVIDER_DEFAULTS = {
  EKAP: { rateLimitMs: 1500, maxTokens: 3, circuitBreakerThreshold: 5, circuitBreakerResetMs: 60_000 },
  TED: { rateLimitMs: 500, maxTokens: 5, circuitBreakerThreshold: 5, circuitBreakerResetMs: 60_000 },
  TUIK: { rateLimitMs: 2000, maxTokens: 2, circuitBreakerThreshold: 5, circuitBreakerResetMs: 60_000 },
  MERSIS: { rateLimitMs: 1000, maxTokens: 3, circuitBreakerThreshold: 5, circuitBreakerResetMs: 60_000 },
  IYZICO: { rateLimitMs: 200, maxTokens: 10, circuitBreakerThreshold: 5, circuitBreakerResetMs: 60_000 },
  NETGSM: { rateLimitMs: 1000, maxTokens: 5, circuitBreakerThreshold: 5, circuitBreakerResetMs: 60_000 },
  MEVZUAT: { rateLimitMs: 2000, maxTokens: 2, circuitBreakerThreshold: 5, circuitBreakerResetMs: 60_000 },
  RESMI_GAZETE: { rateLimitMs: 2000, maxTokens: 2, circuitBreakerThreshold: 5, circuitBreakerResetMs: 60_000 },
} as const;

export interface CacheConfig {
  /** Time-to-live in seconds */
  ttl: number;
  /** Serve stale data while revalidating in the background */
  staleWhileRevalidate: boolean;
  /** Cache key prefix or identifier */
  key: string;
}

export interface ProviderConfig {
  /** Unique name of the provider */
  name: string;
  /** Base URL for the external API */
  baseUrl: string;
  /** Rate limit: minimum milliseconds between requests */
  rateLimitMs: number;
  /** Maximum tokens in the rate-limiter bucket */
  maxTokens: number;
  /** Default cache configuration */
  cache: CacheConfig;
  /** Maximum retry attempts on failure */
  maxRetries: number;
  /** Base delay in ms for exponential backoff */
  baseDelayMs: number;
  /** Circuit breaker failure threshold before opening */
  circuitBreakerThreshold: number;
  /** Circuit breaker reset timeout in ms */
  circuitBreakerResetMs: number;
}

export interface SyncResult {
  provider: string;
  operation: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  recordCount: number;
  errorMessage?: string;
  startedAt: Date;
  completedAt?: Date;
}
