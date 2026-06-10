import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionToken, verifySessionToken } from "./auth";

const AUTH_SECRET = "test-secret-minimum-32-characters-long!!";

describe("auth JWT sessions", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    vi.stubEnv("AUTH_SECRET", AUTH_SECRET);
  });

  // Happy path: crear y verificar token admin.
  it("createSessionToken genera JWT verificable", async () => {
    const token = await createSessionToken("admin");
    const session = await verifySessionToken(token);
    expect(session).toEqual({ username: "admin", role: "admin" });
  });

  // Seguridad: token inválido retorna null.
  it("verifySessionToken retorna null para token corrupto", async () => {
    expect(await verifySessionToken("not-a-jwt")).toBeNull();
  });

  // Seguridad: token con rol incorrecto es rechazado.
  it("verifySessionToken rechaza rol distinto de admin", async () => {
    const { SignJWT } = await import("jose");
    const badToken = await new SignJWT({ role: "user" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("admin")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode(AUTH_SECRET));

    expect(await verifySessionToken(badToken)).toBeNull();
  });
});
