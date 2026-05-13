import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/admin",
  "/manager",
  "/runner",
  "/account",
  "/me",
];

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!isProtected) return NextResponse.next();

  const token = request.cookies.get("access_token")?.value;
  if (!token) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Skip static files, Next internals, and public API routes.
  matcher: [
    "/((?!_next/static|_next/image|favicon|icon|og|api|uploads|robots.txt|sitemap.xml).*)",
  ],
};
