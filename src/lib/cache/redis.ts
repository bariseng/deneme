// ─── Upstash Redis Cache Layer ───────────────────────────────
// Serverless-compatible Redis for high-performance caching

import { Redis } from "@upstash/redis";

// ─── Client ─────────────────────────────────────────────────

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

function createRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_URL;
  const token = process.env.UPSTASH_REDIS_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== "production" && redis) {
  globalForRedis.redis = redis;
}

// ─── Cache Helpers ──────────────────────────────────────────

interface CacheOptions {
  /** TTL in seconds */
  ttl?: number;
  /** Cache key prefix for namespacing */
  prefix?: string;
}

const DEFAULT_TTL = 300; // 5 minutes

function buildKey(prefix: string | undefined, key: string): string {
  return prefix ? `${prefix}:${key}` : key;
}

/**
 * Get a value from Redis cache, or compute and store it.
 * Falls back to direct computation if Redis is unavailable.
 */
export async function cacheGet<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {},
): Promise<T> {
  const { ttl = DEFAULT_TTL, prefix } = options;
  const fullKey = buildKey(prefix, key);

  if (!redis) return fetcher();

  try {
    const cached = await redis.get<T>(fullKey);
    if (cached !== null && cached !== undefined) return cached;
  } catch {
    // Redis unavailable — fall through to fetcher
  }

  const value = await fetcher();

  if (redis) {
    try {
      await redis.set(fullKey, value, { ex: ttl });
    } catch {
      // Best-effort cache write
    }
  }

  return value;
}

/**
 * Invalidate a single cache key.
 */
export async function cacheInvalidate(key: string, prefix?: string): Promise<void> {
  if (!redis) return;
  try {
    await redis.del(buildKey(prefix, key));
  } catch {
    // Best-effort
  }
}

/**
 * Invalidate all keys matching a prefix pattern.
 */
export async function cacheInvalidatePrefix(prefix: string): Promise<number> {
  if (!redis) return 0;
  try {
    const keys = await redis.keys(`${prefix}:*`);
    if (keys.length === 0) return 0;
    await redis.del(...keys);
    return keys.length;
  } catch {
    return 0;
  }
}

/**
 * Stale-while-revalidate: return stale data immediately,
 * refresh in background.
 */
export async function cacheSWR<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions & { staleTtl?: number } = {},
): Promise<T> {
  const { ttl = DEFAULT_TTL, staleTtl = ttl * 2, prefix } = options;
  const fullKey = buildKey(prefix, key);
  const metaKey = `${fullKey}:_meta`;

  if (!redis) return fetcher();

  try {
    const cached = await redis.get<T>(fullKey);
    if (cached !== null && cached !== undefined) {
      // Check if fresh
      const meta = await redis.get<{ setAt: number }>(metaKey);
      const age = meta ? (Date.now() - meta.setAt) / 1000 : Infinity;

      if (age > ttl && age < staleTtl) {
        // Stale — return cached and refresh in background
        void fetcher().then(async (fresh) => {
          try {
            await redis!.set(fullKey, fresh, { ex: staleTtl });
            await redis!.set(metaKey, { setAt: Date.now() }, { ex: staleTtl });
          } catch { /* best-effort */ }
        });
      }
      return cached;
    }
  } catch {
    // Redis unavailable
  }

  const value = await fetcher();

  if (redis) {
    try {
      await redis.set(fullKey, value, { ex: staleTtl });
      await redis.set(metaKey, { setAt: Date.now() }, { ex: staleTtl });
    } catch { /* best-effort */ }
  }

  return value;
}

// ─── Cache Stats ────────────────────────────────────────────

let _hits = 0;
let _misses = 0;

export function trackCacheHit(): void { _hits++; }
export function trackCacheMiss(): void { _misses++; }

export function getCacheStats(): { hits: number; misses: number; hitRate: number } {
  const total = _hits + _misses;
  return {
    hits: _hits,
    misses: _misses,
    hitRate: total > 0 ? Math.round((_hits / total) * 100) : 0,
  };
}

export function resetCacheStats(): void {
  _hits = 0;
  _misses = 0;
}

// ─── Cache Key Constants ────────────────────────────────────

export const CACHE_KEYS = {
  TENDER_LIST: "tenders:list",
  TENDER_DETAIL: "tenders:detail",
  DASHBOARD_KPI: "dashboard:kpi",
  DASHBOARD_CHARTS: "dashboard:charts",
  PRICE_INDEX: "price-index",
  SECTOR_DIST: "sector-distribution",
  CITY_HEATMAP: "city-heatmap",
  MONTHLY_VOLUME: "monthly-volume",
  HEALTH_STATUS: "health:status",
} as const;
