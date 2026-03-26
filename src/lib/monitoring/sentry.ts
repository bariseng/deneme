// ─── Sentry Error Tracking & Performance Monitoring ─────────

import * as Sentry from "@sentry/nextjs";

let _initialized = false;

/**
 * Initialize Sentry for server-side error tracking.
 * Safe to call multiple times — only initializes once.
 */
export function initSentry(): void {
  if (_initialized) return;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
    profilesSampleRate: 0.1,
    beforeSend(event) {
      // PII scrubbing
      if (event.user) {
        delete event.user.ip_address;
        delete event.user.email;
      }
      return event;
    },
    ignoreErrors: [
      "UNAUTHORIZED",
      "FORBIDDEN",
      "AbortError",
      "NEXT_NOT_FOUND",
    ],
  });
  _initialized = true;
}

/**
 * Capture an error with optional context.
 */
export function captureError(
  error: Error | string,
  context?: Record<string, unknown>,
): void {
  if (!process.env.SENTRY_DSN) {
    console.error("[Sentry disabled]", error);
    return;
  }
  initSentry();
  const err = typeof error === "string" ? new Error(error) : error;
  if (context) {
    Sentry.withScope((scope) => {
      scope.setExtras(context);
      Sentry.captureException(err);
    });
  } else {
    Sentry.captureException(err);
  }
}

/**
 * Track a custom metric for alerting.
 */
export function trackMetric(
  name: string,
  value: number,
  tags?: Record<string, string>,
): void {
  if (!process.env.SENTRY_DSN) return;
  initSentry();
  Sentry.metrics.gauge(name, value, {
    ...(tags ? { tags } : {}),
  } as Parameters<typeof Sentry.metrics.gauge>[2]);
}
