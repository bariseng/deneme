// ─── Custom Performance Metrics ─────────────────────────────
// API latency, cache hit rate, sync status tracking

import { getCacheStats } from "@/lib/cache/redis";
import { captureError, trackMetric } from "./sentry";

// ─── API Latency Tracker ────────────────────────────────────

interface LatencyRecord {
  route: string;
  method: string;
  durationMs: number;
  status: number;
  timestamp: number;
}

const latencyBuffer: LatencyRecord[] = [];
const MAX_BUFFER = 1000;

export function recordApiLatency(
  route: string,
  method: string,
  durationMs: number,
  status: number,
): void {
  latencyBuffer.push({ route, method, durationMs, status, timestamp: Date.now() });
  if (latencyBuffer.length > MAX_BUFFER) latencyBuffer.shift();

  // Track high latency
  if (durationMs > 500) {
    trackMetric("api.latency.high", durationMs, { route, method });
  }

  // Track errors
  if (status >= 500) {
    trackMetric("api.error", 1, { route, method, status: String(status) });
  }
}

// ─── Sync Status ────────────────────────────────────────────

interface SyncStatus {
  provider: string;
  lastSync: Date | null;
  lastError: string | null;
  recordCount: number;
  status: "ok" | "error" | "stale";
}

const syncStatuses: Map<string, SyncStatus> = new Map();

export function updateSyncStatus(
  provider: string,
  success: boolean,
  recordCount: number,
  error?: string,
): void {
  syncStatuses.set(provider, {
    provider,
    lastSync: success ? new Date() : syncStatuses.get(provider)?.lastSync || null,
    lastError: error || null,
    recordCount,
    status: success ? "ok" : "error",
  });
}

export function getSyncStatuses(): SyncStatus[] {
  const statuses = Array.from(syncStatuses.values());

  // Mark stale providers (no sync in 6 hours)
  const sixHoursAgo = Date.now() - 6 * 3600_000;
  for (const s of statuses) {
    if (s.status === "ok" && s.lastSync && s.lastSync.getTime() < sixHoursAgo) {
      s.status = "stale";
    }
  }

  return statuses;
}

// ─── Error Rate Alerting ────────────────────────────────────

export function checkErrorRate(): {
  errorRate: number;
  alert: boolean;
  total: number;
  errors: number;
} {
  const fiveMinAgo = Date.now() - 5 * 60_000;
  const recent = latencyBuffer.filter((r) => r.timestamp > fiveMinAgo);
  const errors = recent.filter((r) => r.status >= 500).length;
  const total = recent.length;
  const errorRate = total > 0 ? (errors / total) * 100 : 0;

  const alert = errorRate > 5 && total >= 10;
  if (alert) {
    captureError("High error rate detected", { errorRate, total, errors });
    trackMetric("api.error_rate.alert", errorRate);
  }

  return { errorRate: Math.round(errorRate * 100) / 100, alert, total, errors };
}

// ─── Aggregate Metrics ──────────────────────────────────────

export function getPerformanceMetrics(): {
  cache: ReturnType<typeof getCacheStats>;
  sync: SyncStatus[];
  errorRate: ReturnType<typeof checkErrorRate>;
  apiLatency: {
    p50: number;
    p95: number;
    p99: number;
    avg: number;
  };
  requestCount: number;
} {
  const fiveMinAgo = Date.now() - 5 * 60_000;
  const recent = latencyBuffer.filter((r) => r.timestamp > fiveMinAgo);
  const durations = recent.map((r) => r.durationMs).sort((a, b) => a - b);

  const percentile = (arr: number[], p: number) => {
    if (arr.length === 0) return 0;
    const idx = Math.ceil((p / 100) * arr.length) - 1;
    return arr[Math.max(0, idx)];
  };

  return {
    cache: getCacheStats(),
    sync: getSyncStatuses(),
    errorRate: checkErrorRate(),
    apiLatency: {
      p50: percentile(durations, 50),
      p95: percentile(durations, 95),
      p99: percentile(durations, 99),
      avg: durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0,
    },
    requestCount: recent.length,
  };
}
