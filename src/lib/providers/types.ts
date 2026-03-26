// ─── Provider Interfaces ──────────────────────────────────────

export interface HealthCheckResult {
  ok: boolean;
  latencyMs: number;
  message?: string;
}

export interface DataProvider<T> {
  fetch(params: Record<string, unknown>): Promise<T[]>;
  fetchById(id: string): Promise<T | null>;
  healthCheck(): Promise<HealthCheckResult>;
}

export interface CacheConfig {
  ttlSeconds?: number;
  /** Alias for ttlSeconds (backward compat) */
  ttl?: number;
  staleWhileRevalidate?: boolean;
  prefix?: string;
  key?: string;
}

export interface ProviderConfig {
  name: string;
  baseUrl: string;
  rateLimitMs: number;
  cacheTtlSeconds?: number;
  maxRetries: number;
  maxTokens?: number;
  baseDelayMs?: number;
  circuitBreakerThreshold?: number;
  circuitBreakerResetMs?: number;
  cache?: CacheConfig;
}

export const PROVIDER_DEFAULTS = {
  EKAP: {
    rateLimitMs: 1500,
    maxTokens: 1,
    cacheTtlSeconds: 3600,
    maxRetries: 2,
    baseDelayMs: 1000,
    circuitBreakerThreshold: 5,
    circuitBreakerResetMs: 60000,
  },
  TED: {
    rateLimitMs: 500,
    maxTokens: 2,
    cacheTtlSeconds: 86400,
    maxRetries: 2,
    baseDelayMs: 500,
    circuitBreakerThreshold: 5,
    circuitBreakerResetMs: 60000,
  },
  TUIK: {
    rateLimitMs: 2000,
    maxTokens: 1,
    cacheTtlSeconds: 86400,
    maxRetries: 2,
    baseDelayMs: 1000,
    circuitBreakerThreshold: 3,
    circuitBreakerResetMs: 120000,
  },
  MEVZUAT: {
    rateLimitMs: 2000,
    maxTokens: 1,
    cacheTtlSeconds: 86400,
    maxRetries: 1,
    baseDelayMs: 1000,
    circuitBreakerThreshold: 3,
    circuitBreakerResetMs: 120000,
  },
  MERSIS: {
    rateLimitMs: 3000,
    maxTokens: 1,
    cacheTtlSeconds: 604800,
    maxRetries: 1,
    baseDelayMs: 2000,
    circuitBreakerThreshold: 3,
    circuitBreakerResetMs: 300000,
  },
  KAP: {
    rateLimitMs: 2000,
    maxTokens: 1,
    cacheTtlSeconds: 86400,
    maxRetries: 2,
    baseDelayMs: 1000,
    circuitBreakerThreshold: 5,
    circuitBreakerResetMs: 60000,
  },
  TOBB: {
    rateLimitMs: 1500,
    maxTokens: 1,
    cacheTtlSeconds: 86400,
    maxRetries: 2,
    baseDelayMs: 1000,
    circuitBreakerThreshold: 3,
    circuitBreakerResetMs: 120000,
  },
} as const;

export interface SyncResult {
  provider: string;
  status: "COMPLETED" | "FAILED";
  operation?: string;
  recordsProcessed?: number;
  recordsCreated?: number;
  recordsUpdated?: number;
  recordCount?: number;
  errors?: string[];
  errorMessage?: string;
  durationMs?: number;
  startedAt?: Date;
  completedAt?: Date;
}

export interface SyncLogResult {
  status: "COMPLETED" | "FAILED";
  recordCount: number;
  durationMs: number;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
