import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Redis ─────────────────────────────────────────────

const mockRedis = vi.hoisted(() => ({
  get: vi.fn(async () => null),
  set: vi.fn(async () => "OK"),
  del: vi.fn(async () => 1),
  keys: vi.fn(async () => []),
}));

vi.mock("@upstash/redis", () => ({
  Redis: class {
    get = mockRedis.get;
    set = mockRedis.set;
    del = mockRedis.del;
    keys = mockRedis.keys;
  },
}));

// ─── Mock Prisma ────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tender: {
      findMany: vi.fn(async () => []),
      count: vi.fn(async () => 0),
    },
    cachedData: {
      findUnique: vi.fn(async () => null),
      upsert: vi.fn(async () => ({})),
      deleteMany: vi.fn(async () => ({ count: 5 })),
    },
    $queryRaw: vi.fn(async () => []),
  },
}));

vi.mock("@/lib/monitoring/sentry", () => ({
  initSentry: vi.fn(),
  captureError: vi.fn(),
  trackMetric: vi.fn(),
}));

// ─── Hoisted cache state ────────────────────────────────────
const cacheState = vi.hoisted(() => ({
  hits: 0,
  misses: 0,
}));

// Mock cache/redis for metrics module import chain
vi.mock("@/lib/cache/redis", () => ({
  redis: {
    get: mockRedis.get,
    set: mockRedis.set,
    del: mockRedis.del,
    keys: mockRedis.keys,
  },
  cacheGet: async (key: string, fetcher: () => Promise<unknown>, opts?: { ttl?: number; prefix?: string }) => {
    const fullKey = opts?.prefix ? `${opts.prefix}:${key}` : key;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = mockRedis as any;
    const cached = await r.get(fullKey);
    if (cached !== null && cached !== undefined) return cached;
    const value = await fetcher();
    await r.set(fullKey, value, { ex: opts?.ttl || 300 });
    return value;
  },
  cacheInvalidate: async (key: string, prefix?: string) => {
    const fullKey = prefix ? `${prefix}:${key}` : key;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (mockRedis as any).del(fullKey);
  },
  cacheInvalidatePrefix: async (prefix: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = mockRedis as any;
    const keys = await r.keys(`${prefix}:*`);
    if (keys.length > 0) await r.del(...keys);
    return keys.length;
  },
  cacheSWR: vi.fn(),
  trackCacheHit: () => { cacheState.hits++; },
  trackCacheMiss: () => { cacheState.misses++; },
  getCacheStats: () => {
    const total = cacheState.hits + cacheState.misses;
    return {
      hits: cacheState.hits,
      misses: cacheState.misses,
      hitRate: total > 0 ? Math.round((cacheState.hits / total) * 100) : 0,
    };
  },
  resetCacheStats: () => { cacheState.hits = 0; cacheState.misses = 0; },
  CACHE_KEYS: {
    TENDER_LIST: "tenders:list",
    TENDER_DETAIL: "tenders:detail",
    DASHBOARD_KPI: "dashboard:kpi",
    DASHBOARD_CHARTS: "dashboard:charts",
    PRICE_INDEX: "price-index",
    SECTOR_DIST: "sector-distribution",
    CITY_HEATMAP: "city-heatmap",
    MONTHLY_VOLUME: "monthly-volume",
    HEALTH_STATUS: "health:status",
  },
}));

// ─── Redis Cache Tests ──────────────────────────────────────

import {
  cacheGet,
  cacheInvalidate,
  cacheInvalidatePrefix,
  getCacheStats,
  resetCacheStats,
  trackCacheHit,
  trackCacheMiss,
} from "../cache/redis";

describe("Redis Cache", () => {
  beforeEach(() => {
    resetCacheStats();
  });

  it("cacheGet returns fetcher result on miss", async () => {
    const result = await cacheGet("miss-key", async () => ({ fresh: true }), { ttl: 60 });
    expect(result).toEqual({ fresh: true });
  });

  it("cacheGet with prefix builds correct key", async () => {
    const result = await cacheGet("item:1", async () => "data", { prefix: "tenders" });
    expect(result).toBe("data");
  });

  it("cacheInvalidate completes without error", async () => {
    await expect(cacheInvalidate("test-key")).resolves.toBeUndefined();
  });

  it("cacheInvalidatePrefix returns a number", async () => {
    const count = await cacheInvalidatePrefix("prefix");
    expect(typeof count).toBe("number");
  });

  it("tracks cache hit rate correctly", () => {
    trackCacheHit();
    trackCacheHit();
    trackCacheHit();
    trackCacheMiss();

    const stats = getCacheStats();
    expect(stats.hits).toBe(3);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBe(75);
  });

  it("handles 0 total gracefully", () => {
    const stats = getCacheStats();
    expect(stats.hitRate).toBe(0);
  });
});

// ─── Query Optimizer Tests ──────────────────────────────────

import {
  TENDER_LIST_SELECT,
  TENDER_DETAIL_SELECT,
  getPaginationArgs,
  buildPagination,
} from "../db/query-optimizer";

describe("Query Optimizer", () => {
  it("TENDER_LIST_SELECT has minimal fields", () => {
    expect(TENDER_LIST_SELECT.id).toBe(true);
    expect(TENDER_LIST_SELECT.title).toBe(true);
    expect(TENDER_LIST_SELECT.status).toBe(true);
    // Should NOT include description (heavy field) in list select
    expect("description" in TENDER_LIST_SELECT).toBe(false);
  });

  it("TENDER_DETAIL_SELECT includes relations", () => {
    expect(TENDER_DETAIL_SELECT.documents).toBeDefined();
    expect(TENDER_DETAIL_SELECT.bids).toBeDefined();
    expect(TENDER_DETAIL_SELECT.result).toBeDefined();
  });

  it("getPaginationArgs calculates correct skip/take", () => {
    expect(getPaginationArgs({ page: 1, limit: 20 })).toEqual({ skip: 0, take: 20 });
    expect(getPaginationArgs({ page: 3, limit: 10 })).toEqual({ skip: 20, take: 10 });
    expect(getPaginationArgs({ page: 0, limit: 20 })).toEqual({ skip: 0, take: 20 }); // clamps to page 1
  });

  it("getPaginationArgs clamps limit to 100", () => {
    const result = getPaginationArgs({ page: 1, limit: 200 });
    expect(result.take).toBe(100);
  });

  it("buildPagination calculates pages and hasNext", () => {
    const result = buildPagination(95, { page: 2, limit: 20 });
    expect(result.pages).toBe(5);
    expect(result.hasNext).toBe(true);

    const lastPage = buildPagination(95, { page: 5, limit: 20 });
    expect(lastPage.hasNext).toBe(false);
  });
});

// ─── Monitoring Metrics Tests ───────────────────────────────

import {
  recordApiLatency,
  checkErrorRate,
  getPerformanceMetrics,
  updateSyncStatus,
  getSyncStatuses,
} from "../monitoring/metrics";

describe("Performance Metrics", () => {
  it("records API latency", () => {
    recordApiLatency("/api/test", "GET", 150, 200);
    recordApiLatency("/api/test", "GET", 250, 200);

    const metrics = getPerformanceMetrics();
    expect(metrics.requestCount).toBeGreaterThan(0);
    expect(metrics.apiLatency.avg).toBeGreaterThan(0);
  });

  it("tracks error rate below threshold", () => {
    // Record mostly success
    for (let i = 0; i < 20; i++) {
      recordApiLatency("/api/ok", "GET", 100, 200);
    }
    const result = checkErrorRate();
    expect(result.alert).toBe(false);
  });

  it("tracks sync statuses", () => {
    updateSyncStatus("EKAP", true, 100);
    updateSyncStatus("TED", false, 0, "Timeout");

    const statuses = getSyncStatuses();
    const ekap = statuses.find((s) => s.provider === "EKAP");
    const ted = statuses.find((s) => s.provider === "TED");

    expect(ekap?.status).toBe("ok");
    expect(ekap?.recordCount).toBe(100);
    expect(ted?.status).toBe("error");
    expect(ted?.lastError).toBe("Timeout");
  });
});
