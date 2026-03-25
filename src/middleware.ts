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
];

const authPaths = ["/giris", "/kayit"];

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

  return NextResponse.next();
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
    "/giris",
    "/kayit",
  ],
};
