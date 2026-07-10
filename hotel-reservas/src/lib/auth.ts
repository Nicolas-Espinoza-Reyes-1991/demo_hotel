import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { StaffRole } from "@prisma/client";
import { AppError } from "@/lib/api-response";

export const SESSION_COOKIE = "hotel_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 días

export type SessionRole = "ADMIN" | "STAFF";

export type SessionPayload = {
  userId: string;
  username: string;
  role: SessionRole;
};

function getAuthSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET debe tener al menos 32 caracteres.");
  }
  return new TextEncoder().encode(secret);
}

function normalizeRole(role: unknown): SessionRole | null {
  if (role === "ADMIN" || role === "STAFF") return role;
  // Compatibilidad con sesiones antiguas (role: "admin")
  if (role === "admin") return "ADMIN";
  return null;
}

export async function createSessionToken(input: {
  userId: string;
  username: string;
  role: StaffRole | SessionRole;
}): Promise<string> {
  return new SignJWT({ role: input.role, userId: input.userId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(input.username)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getAuthSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getAuthSecret());
    const username = payload.sub;
    const role = normalizeRole(payload.role);
    const userId = typeof payload.userId === "string" ? payload.userId : "";
    if (!username || !role) return null;
    // Sesiones legacy sin userId: permitir con userId vacío (solo hasta re-login)
    return { userId, username, role };
  } catch {
    return null;
  }
}

function useSecureSessionCookies(): boolean {
  const forced = process.env.SESSION_COOKIE_SECURE?.trim().toLowerCase();
  if (forced === "true") return true;
  if (forced === "false") return false;
  const appUrl = process.env.APP_URL?.trim() ?? "";
  return appUrl.startsWith("https://");
}

function getCookiePath(): string {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim();
  if (basePath && basePath !== "/") {
    return basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
  }
  return "/";
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: useSecureSessionCookies(),
    sameSite: "lax" as const,
    path: getCookiePath(),
    maxAge: SESSION_MAX_AGE,
  };
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new AppError("No autorizado.", 401, "UNAUTHORIZED");
  return session;
}

export async function requireAdminSession(): Promise<SessionPayload> {
  const session = await requireSession();
  if (session.role !== "ADMIN") {
    throw new AppError("Solo el administrador puede realizar esta acción.", 403, "FORBIDDEN");
  }
  return session;
}
