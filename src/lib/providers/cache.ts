// ─── Provider-level Cache Abstraction ─────────────────────────
// Wraps redis cache with provider-specific TTL and prefix

import { redis } from "@/lib/cache/redis";
import { cacheGet, cacheSWR, cacheInvalidatePrefix } from "@/lib/cache/redis";
import type { CacheConfig } from "./types";

export class ProviderCache {
  private readonly prefix: string;
  private readonly defaultTtl: number;

  constructor(prefix?: string, defaultTtlSeconds?: number) {
    this.prefix = prefix ?? "provider";
    this.defaultTtl = defaultTtlSeconds ?? 300;
  }

  /** Fetch-through cache: returns cached value or calls fetcher */
  async getOrFetch<T>(key: string, fetcher: () => Promise<T>, ttl?: number): Promise<T> {
    return cacheGet(key, fetcher, { prefix: this.prefix, ttl: ttl ?? this.defaultTtl });
  }

  /** Direct cache read (returns null if not found) */
  async get<T>(key: string, fetcherOrNothing?: () => Promise<T>, ttl?: number): Promise<T | null> {
    if (fetcherOrNothing) {
      return cacheGet(key, fetcherOrNothing, { prefix: this.prefix, ttl: ttl ?? this.defaultTtl });
    }
    if (!redis) return null;
    try {
      const fullKey = `${this.prefix}:${key}`;
      return await redis.get<T>(fullKey) ?? null;
    } catch {
      return null;
    }
  }

  /** Direct cache write */
  async set<T>(key: string, value: T, config?: CacheConfig, _name?: string): Promise<void> {
    if (!redis) return;
    try {
      const ttl = config?.ttlSeconds ?? config?.ttl ?? this.defaultTtl;
      const prefix = config?.prefix ?? this.prefix;
      const fullKey = `${prefix}:${key}`;
      await redis.set(fullKey, value, { ex: ttl });
    } catch {
      // Best-effort
    }
  }

  async swr<T>(key: string, fetcher: () => Promise<T>, ttl?: number): Promise<T> {
    return cacheSWR(key, fetcher, {
      prefix: this.prefix,
      ttl: ttl ?? this.defaultTtl,
      staleTtl: (ttl ?? this.defaultTtl) * 2,
    });
  }

  async invalidateAll(): Promise<number> {
    return cacheInvalidatePrefix(this.prefix);
  }

  /** Clean up expired cache entries */
  async cleanup(): Promise<number> {
    return cacheInvalidatePrefix(this.prefix);
  }
}
