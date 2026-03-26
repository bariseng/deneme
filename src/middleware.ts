import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedPaths = [
  "/dashboard",
  "/teklifler",
  "/ayarlar",
  "/raporlar",
  "/agent",
  "/projeler",
  "/belgeler",
  "/istihbarat",
  "/sozlesmeler",
  "/topluluk",
  "/white-label",
  "/guvenlik",
  "/ortaklik",
  "/finans",
  "/akademi",
  "/fiyat-endeksi",
  "/mali-skor",
  "/mevzuat",
  "/uluslararasi",
  "/takvim",
];

const authPaths = ["/giris", "/kayit"];

// CSP directives
const CSP = [
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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("authjs.session-token")?.value
    || request.cookies.get("__Secure-authjs.session-token")?.value;

  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
  const isAuthPage = authPaths.some((p) => pathname.startsWith(p));

  if (isProtected && !token) {
    const url = new URL("/giris", request.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthPage && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const response = NextResponse.next();

  // Security headers
  response.headers.set("Content-Security-Policy", CSP);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  // CORS for API routes
  if (pathname.startsWith("/api/")) {
    const origin = request.headers.get("origin");
    const allowed = (process.env.CORS_ORIGINS || "").split(",").filter(Boolean);
    if (origin && (allowed.includes(origin) || allowed.includes("*"))) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
      response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key, X-CRON-SECRET");
      response.headers.set("Access-Control-Allow-Credentials", "true");
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/teklifler/:path*",
    "/ayarlar/:path*",
    "/raporlar/:path*",
    "/agent/:path*",
    "/projeler/:path*",
    "/belgeler/:path*",
    "/istihbarat/:path*",
    "/sozlesmeler/:path*",
    "/topluluk/:path*",
    "/white-label/:path*",
    "/guvenlik/:path*",
    "/ortaklik/:path*",
    "/finans/:path*",
    "/akademi/:path*",
    "/fiyat-endeksi/:path*",
    "/mali-skor/:path*",
    "/mevzuat/:path*",
    "/uluslararasi/:path*",
    "/takvim/:path*",
    "/giris",
    "/kayit",
    "/api/:path*",
  ],
};
