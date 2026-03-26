// ─── API Rate Limiter ────────────────────────────────────────
// Per-user and per-IP rate limiting for API routes

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitConfig {
  windowMs: number;    // Time window in ms
  maxRequests: number; // Max requests per window
}

const DEFAULT_USER_LIMIT: RateLimitConfig = { windowMs: 60_000, maxRequests: 60 };
const DEFAULT_IP_LIMIT: RateLimitConfig = { windowMs: 60_000, maxRequests: 30 };
const AUTH_LIMIT: RateLimitConfig = { windowMs: 900_000, maxRequests: 10 }; // 15min
const API_KEY_LIMIT: RateLimitConfig = { windowMs: 3600_000, maxRequests: 1000 };

// In-memory store (use Redis in production for multi-instance)
const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes
let cleanupTimer: ReturnType<typeof setInterval> | null = null;
function ensureCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt < now) store.delete(key);
    }
  }, 300_000);
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
}

function checkLimit(key: string, config: RateLimitConfig): RateLimitResult {
  ensureCleanup();
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs, limit: config.maxRequests };
  }

  entry.count++;
  store.set(key, entry);

  if (entry.count > config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt, limit: config.maxRequests };
  }

  return { allowed: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt, limit: config.maxRequests };
}

export function rateLimitByUser(userId: string, config = DEFAULT_USER_LIMIT): RateLimitResult {
  return checkLimit(`user:${userId}`, config);
}

export function rateLimitByIp(ip: string, config = DEFAULT_IP_LIMIT): RateLimitResult {
  return checkLimit(`ip:${ip}`, config);
}

export function rateLimitAuth(ip: string): RateLimitResult {
  return checkLimit(`auth:${ip}`, AUTH_LIMIT);
}

export function rateLimitApiKey(keyPrefix: string, maxRequests = 1000): RateLimitResult {
  return checkLimit(`apikey:${keyPrefix}`, { ...API_KEY_LIMIT, maxRequests });
}

// Get client IP from request headers
export function getClientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || headers.get("x-real-ip")
    || "unknown";
}

// Apply rate limit headers to response
export function setRateLimitHeaders(
  headers: Headers,
  result: RateLimitResult,
): void {
  headers.set("X-RateLimit-Limit", String(result.limit));
  headers.set("X-RateLimit-Remaining", String(result.remaining));
  headers.set("X-RateLimit-Reset", String(Math.ceil(result.resetAt / 1000)));
}

// Reset for testing
export function resetStore(): void {
  store.clear();
}
