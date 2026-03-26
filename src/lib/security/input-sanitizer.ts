// ─── Input Sanitization & Security Headers ──────────────────
// XSS prevention, CSP headers, CORS config, cron security

import DOMPurify from "isomorphic-dompurify";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ─── Input Sanitization ─────────────────────────────────────

export function sanitizeHtml(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "p", "br", "ul", "ol", "li"],
    ALLOWED_ATTR: ["href", "target", "rel"],
  });
}

export function sanitizeText(input: string): string {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj };
  for (const key of Object.keys(result)) {
    const val = result[key];
    if (typeof val === "string") {
      (result as Record<string, unknown>)[key] = sanitizeText(val);
    } else if (val && typeof val === "object" && !Array.isArray(val)) {
      (result as Record<string, unknown>)[key] = sanitizeObject(val as Record<string, unknown>);
    }
  }
  return result;
}

// ─── CSP Headers ────────────────────────────────────────────

const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://*.googleusercontent.com",
  "connect-src 'self' https://api.iyzipay.com https://api.openai.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

export function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("Content-Security-Policy", CSP_DIRECTIVES);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  return response;
}

// ─── CORS Configuration ─────────────────────────────────────

const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || "").split(",").filter(Boolean);

export function handleCors(request: NextRequest, response: NextResponse): NextResponse {
  const origin = request.headers.get("origin");

  if (origin && (ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes("*"))) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key, X-CRON-SECRET");
    response.headers.set("Access-Control-Max-Age", "86400");
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }

  return response;
}

// ─── Cron Security ──────────────────────────────────────────

const VERCEL_CRON_IPS = [
  "76.76.21.0/24",
  "76.76.21.21",
];

export function verifyCronRequest(request: NextRequest): boolean {
  const cronSecret = request.headers.get("x-cron-secret")
    || request.headers.get("authorization")?.replace("Bearer ", "");

  if (!process.env.CRON_SECRET) return false;
  if (cronSecret !== process.env.CRON_SECRET) return false;

  // Optional: IP whitelist for Vercel cron
  if (process.env.VERIFY_CRON_IP === "true") {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    if (ip && !VERCEL_CRON_IPS.some((cidr) => isIpInRange(ip, cidr))) {
      return false;
    }
  }

  return true;
}

function isIpInRange(ip: string, cidr: string): boolean {
  if (!cidr.includes("/")) return ip === cidr;
  const [range, bits] = cidr.split("/");
  const mask = ~(2 ** (32 - parseInt(bits)) - 1);
  const ipNum = ipToNum(ip);
  const rangeNum = ipToNum(range);
  return (ipNum & mask) === (rangeNum & mask);
}

function ipToNum(ip: string): number {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + parseInt(octet), 0);
}

// ─── Webhook Signature Verification ─────────────────────────

export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  const crypto = require("crypto") as typeof import("crypto");
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
