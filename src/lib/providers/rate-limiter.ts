// ─── Token Bucket Rate Limiter ──────────────────────────────

interface RateLimiterConfig {
  /** Maximum tokens in the bucket */
  maxTokens: number;
  /** Refill interval in milliseconds */
  refillIntervalMs: number;
  /** Tokens added per refill interval */
  tokensPerInterval: number;
}

interface RateLimiterStatus {
  availableTokens: number;
  maxTokens: number;
  queueLength: number;
}

type QueueItem = {
  resolve: () => void;
};

export class RateLimiter {
  private tokens: number;
  private readonly maxTokens: number;
  private readonly refillIntervalMs: number;
  private readonly tokensPerInterval: number;
  private lastRefillTime: number;
  private queue: QueueItem[] = [];
  private drainTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(config: RateLimiterConfig) {
    this.maxTokens = config.maxTokens;
    this.tokens = config.maxTokens;
    this.refillIntervalMs = config.refillIntervalMs;
    this.tokensPerInterval = config.tokensPerInterval;
    this.lastRefillTime = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefillTime;
    const intervals = Math.floor(elapsed / this.refillIntervalMs);
    if (intervals > 0) {
      this.tokens = Math.min(
        this.maxTokens,
        this.tokens + intervals * this.tokensPerInterval,
      );
      this.lastRefillTime = now;
    }
  }

  /**
   * Acquire a token, waiting if necessary until one is available.
   */
  async acquire(): Promise<void> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    // Queue the request and wait
    return new Promise<void>((resolve) => {
      this.queue.push({ resolve });
      this.scheduleDrain();
    });
  }

  /**
   * Try to acquire a token immediately.
   * Returns true if a token was acquired, false otherwise.
   */
  tryAcquire(): boolean {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }

  /**
   * Get the current status of the rate limiter.
   */
  getStatus(): RateLimiterStatus {
    this.refill();
    return {
      availableTokens: this.tokens,
      maxTokens: this.maxTokens,
      queueLength: this.queue.length,
    };
  }

  private scheduleDrain(): void {
    if (this.drainTimer !== null) return;

    this.drainTimer = setTimeout(() => {
      this.drainTimer = null;
      this.refill();

      while (this.queue.length > 0 && this.tokens >= 1) {
        this.tokens -= 1;
        const item = this.queue.shift()!;
        item.resolve();
      }

      if (this.queue.length > 0) {
        this.scheduleDrain();
      }
    }, this.refillIntervalMs);
  }
}
