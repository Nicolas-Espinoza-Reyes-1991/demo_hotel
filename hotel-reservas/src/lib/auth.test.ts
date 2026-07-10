import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionToken, getSessionCookieOptions, verifySessionToken } from "./auth";

const AUTH_SECRET = "test-secret-minimum-32-characters-long!!";

describe("auth JWT sessions", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    vi.stubEnv("AUTH_SECRET", AUTH_SECRET);
  });

  it("createSessionToken genera JWT verificable", async () => {
    const token = await createSessionToken({
      userId: "user-1",
      username: "admin",
      role: "ADMIN",
    });
    const session = await verifySessionToken(token);
    expect(session).toEqual({ userId: "user-1", username: "admin", role: "ADMIN" });
  });

  it("verifySessionToken retorna null para token corrupto", async () => {
    expect(await verifySessionToken("not-a-jwt")).toBeNull();
  });

  it("verifySessionToken acepta rol STAFF", async () => {
    const token = await createSessionToken({
      userId: "staff-1",
      username: "recepcion",
      role: "STAFF",
    });
    const session = await verifySessionToken(token);
    expect(session?.role).toBe("STAFF");
  });

  it("verifySessionToken rechaza rol desconocido", async () => {
    const { SignJWT } = await import("jose");
    const badToken = await new SignJWT({ role: "user", userId: "x" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("admin")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode(AUTH_SECRET));

    expect(await verifySessionToken(badToken)).toBeNull();
  });

  it("verifySessionToken acepta sesiones legacy role=admin", async () => {
    const { SignJWT } = await import("jose");
    const legacy = await new SignJWT({ role: "admin" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("admin")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode(AUTH_SECRET));

    const session = await verifySessionToken(legacy);
    expect(session).toEqual({ userId: "", username: "admin", role: "ADMIN" });
  });

  it("cookie secure solo con APP_URL https o SESSION_COOKIE_SECURE", () => {
    vi.stubEnv("APP_URL", "http://178.104.214.147:3000");
    expect(getSessionCookieOptions().secure).toBe(false);

    vi.stubEnv("APP_URL", "https://reservas.adkiniq.cl");
    expect(getSessionCookieOptions().secure).toBe(true);

    vi.stubEnv("SESSION_COOKIE_SECURE", "false");
    expect(getSessionCookieOptions().secure).toBe(false);
  });
});
