// ─── Token Bucket Rate Limiter ────────────────────────────────
// Serverless-safe: per-instance rate limiting (not distributed)

interface BucketState {
  lastRequestTime: number;
  tokens: number;
}

const buckets = new Map<string, BucketState>();

interface RateLimiterConfig {
  maxTokens: number;
  refillIntervalMs: number;
  tokensPerInterval?: number;
}

export class RateLimiter {
  private readonly maxTokens: number;
  private readonly refillRateMs: number;
  private readonly name: string;

  constructor(nameOrConfig: string | RateLimiterConfig, intervalMs?: number, burst?: number) {
    if (typeof nameOrConfig === "object") {
      this.name = `limiter_${Date.now()}`;
      this.maxTokens = nameOrConfig.maxTokens;
      this.refillRateMs = nameOrConfig.refillIntervalMs;
    } else {
      this.name = nameOrConfig;
      this.maxTokens = burst ?? 1;
      this.refillRateMs = intervalMs ?? 1000;
    }
  }

  async acquire(): Promise<void> {
    const now = Date.now();
    const bucket = buckets.get(this.name) ?? { lastRequestTime: 0, tokens: this.maxTokens };

    const elapsed = now - bucket.lastRequestTime;
    const refilled = Math.floor(elapsed / this.refillRateMs);
    bucket.tokens = Math.min(this.maxTokens, bucket.tokens + refilled);

    if (bucket.tokens <= 0) {
      const waitMs = this.refillRateMs - (elapsed % this.refillRateMs);
      await new Promise<void>((resolve) => setTimeout(resolve, waitMs));
      bucket.tokens = 1;
    }

    bucket.tokens--;
    bucket.lastRequestTime = Date.now();
    buckets.set(this.name, bucket);
  }
}

// Pre-configured limiters
export const ekapLimiter = new RateLimiter("ekap", 1500);
export const tedLimiter = new RateLimiter("ted", 500, 2);
export const tuikLimiter = new RateLimiter("tuik", 2000);
export const mevzuatLimiter = new RateLimiter("mevzuat", 2000);
export const mersisLimiter = new RateLimiter("mersis", 3000);
export const kapLimiter = new RateLimiter("kap", 2000);
export const tobbLimiter = new RateLimiter("tobb", 1500);
