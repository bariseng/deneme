// ─── External Data Provider Types ───────────────────────────

export interface DataProvider<T> {
  fetch(params: Record<string, unknown>): Promise<T[]>;
  fetchById(id: string): Promise<T | null>;
  healthCheck(): Promise<boolean>;
}

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
