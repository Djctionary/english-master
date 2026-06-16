import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";

const JWT_SECRET = process.env.JWT_SECRET ?? "english-master-dev-secret-change-in-prod";
const COOKIE_NAME = "em_token";

const PROTECTED_PAGES = ["/learn", "/review"];
const PROTECTED_API_PREFIX = "/api/";
const PUBLIC_API_ROUTES = ["/api/auth"];

interface JwtPayload {
  userId: number;
  username: string;
}

function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

function getTokenFromCookie(cookieHeader: string): string | null {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`));
  return match ? match[1] : null;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes — no auth needed
  if (pathname === "/" || pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  // Public API routes
  if (PUBLIC_API_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check auth for protected pages and API routes
  const isProtectedPage = PROTECTED_PAGES.some((p) => pathname.startsWith(p));
  const isProtectedApi = pathname.startsWith(PROTECTED_API_PREFIX);

  if (!isProtectedPage && !isProtectedApi) {
    return NextResponse.next();
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const token = getTokenFromCookie(cookieHeader);
  const payload = token ? verifyToken(token) : null;

  if (!payload) {
    if (isProtectedPage) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Attach user info as headers for API routes to read
  const response = NextResponse.next();
  response.headers.set("x-user-id", String(payload.userId));
  response.headers.set("x-username", payload.username);
  return response;
}

export const config = {
  matcher: ["/learn/:path*", "/review/:path*", "/api/:path*"],
};
