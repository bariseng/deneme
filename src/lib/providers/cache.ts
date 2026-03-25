// ─── PostgreSQL-backed Cache (via Prisma) ───────────────────

import { prisma } from "@/lib/prisma";
import type { CacheConfig } from "./types";

export class ProviderCache {
  /**
   * Get a cached value by key. Returns null if not found or expired.
   * When staleWhileRevalidate is used, stale data may be returned
   * while a background refresh is triggered via the provided revalidateFn.
   */
  async get<T>(
    key: string,
    revalidateFn?: () => Promise<T>,
  ): Promise<T | null> {
    const entry = await prisma.cachedData.findUnique({
      where: { key },
    });

    if (!entry) return null;

    const now = new Date();
    const isExpired = entry.expiresAt < now;

    if (!isExpired) {
      return entry.value as T;
    }

    // If expired and we have a revalidate function, trigger background refresh
    // and return stale data (stale-while-revalidate pattern)
    if (revalidateFn) {
      // Fire and forget — refresh in background
      void revalidateFn().then(async (freshValue) => {
        await this.set(
          key,
          freshValue,
          {
            ttl: entry.ttl,
            staleWhileRevalidate: true,
            key,
          },
          entry.provider,
        );
      });
      // Return stale data
      return entry.value as T;
    }

    return null;
  }

  /**
   * Set a cached value.
   */
  async set<T>(
    key: string,
    value: T,
    config: CacheConfig,
    provider: string,
  ): Promise<void> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + config.ttl * 1000);

    // JSON fields require JSON.parse(JSON.stringify()) for Prisma InputJsonValue
    const jsonValue = JSON.parse(JSON.stringify(value));

    await prisma.cachedData.upsert({
      where: { key },
      update: {
        value: jsonValue,
        provider,
        ttl: config.ttl,
        expiresAt,
        createdAt: now,
      },
      create: {
        key,
        value: jsonValue,
        provider,
        ttl: config.ttl,
        createdAt: now,
        expiresAt,
      },
    });
  }

  /**
   * Invalidate a single cache entry by key.
   */
  async invalidate(key: string): Promise<void> {
    await prisma.cachedData
      .delete({ where: { key } })
      .catch(() => {
        // Ignore if not found
      });
  }

  /**
   * Invalidate all cache entries for a specific provider.
   */
  async invalidateByProvider(provider: string): Promise<void> {
    await prisma.cachedData.deleteMany({
      where: { provider },
    });
  }

  /**
   * Clear all cached data.
   */
  async clearAll(): Promise<void> {
    await prisma.cachedData.deleteMany();
  }

  /**
   * Remove expired entries (cleanup job).
   */
  async cleanup(): Promise<number> {
    const result = await prisma.cachedData.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
    return result.count;
  }
}
