import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

function requiresAuth(pathname: string, method: string): boolean {
  if (pathname.startsWith("/admin")) return true;

  if (pathname === "/api/calendar") return true;
  if (pathname === "/api/room-blocks" || pathname.startsWith("/api/room-blocks/")) return true;
  if (pathname === "/api/rooms" || pathname.startsWith("/api/rooms/")) return true;
  if (pathname === "/api/uploads/rooms" || pathname.startsWith("/api/uploads/")) return true;

  if (pathname === "/api/reservations" && method === "GET") return true;

  if (pathname.match(/^\/api\/reservations\/([^/]+)\/validate$/)) return true;

  const reservationDetail = pathname.match(/^\/api\/reservations\/([^/]+)$/);
  if (reservationDetail && (method === "GET" || method === "PATCH")) return true;

  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/login" || pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/webhooks/")) {
    return NextResponse.next();
  }

  if (pathname === "/api/payments/config") {
    return NextResponse.next();
  }

  if (pathname === "/api/public/rooms") {
    return NextResponse.next();
  }

  if (pathname === "/api/public/reservations/lookup") {
    return NextResponse.next();
  }

  if (!requiresAuth(pathname, request.method)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (session) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("callbackUrl", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/calendar",
    "/api/room-blocks",
    "/api/room-blocks/:path*",
    "/api/rooms/:path*",
    "/api/uploads/:path*",
    "/api/reservations",
    "/api/reservations/:path*",
  ],
};
