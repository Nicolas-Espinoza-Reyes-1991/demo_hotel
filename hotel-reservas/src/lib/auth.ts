import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "hotel_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 días

export type SessionPayload = {
  username: string;
  role: "admin";
};

function getAuthSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET debe tener al menos 32 caracteres.");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(username: string): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(username)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getAuthSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getAuthSecret());
    const username = payload.sub;
    if (!username || payload.role !== "admin") return null;
    return { username, role: "admin" };
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

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: useSecureSessionCookies(),
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
