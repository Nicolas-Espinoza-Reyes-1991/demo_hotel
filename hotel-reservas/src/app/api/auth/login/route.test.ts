import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockVerify, mockRateLimit, mockCreateToken } = vi.hoisted(() => ({
  mockVerify: vi.fn(),
  mockRateLimit: vi.fn(() => ({ ok: true as const })),
  mockCreateToken: vi.fn().mockResolvedValue("jwt-token"),
}));

vi.mock("@/lib/auth-credentials", () => ({ verifyAdminCredentials: mockVerify }));
vi.mock("@/lib/rate-limit", () => ({
  getClientIp: vi.fn(() => "127.0.0.1"),
  rateLimit: mockRateLimit,
  rateLimitResponse: vi.fn(() => Response.json({ error: "limit" }, { status: 429 })),
}));
vi.mock("@/lib/auth", () => ({
  SESSION_COOKIE: "hotel_session",
  createSessionToken: mockCreateToken,
  getSessionCookieOptions: vi.fn(() => ({ httpOnly: true, path: "/" })),
}));

import { POST } from "./route";

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimit.mockReturnValue({ ok: true });
    vi.stubEnv("AUTH_SECRET", "test-secret-minimum-32-characters-long!!");
  });

  // Happy path: login válido setea cookie de sesión.
  it("inicia sesión con credenciales válidas", async () => {
    mockVerify.mockResolvedValue(true);
    const request = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "admin", password: "secret" }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.username).toBe("admin");
    expect(mockCreateToken).toHaveBeenCalledWith("admin");
  });

  // Seguridad: credenciales inválidas retornan 401.
  it("rechaza credenciales incorrectas", async () => {
    mockVerify.mockResolvedValue(false);
    const request = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "admin", password: "wrong" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  // Zod: payload incompleto.
  it("rechaza payload sin contraseña", async () => {
    const request = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "admin" }),
    });
    expect((await POST(request)).status).toBe(400);
  });

  // Rate limit en login.
  it("responde 429 al superar rate limit", async () => {
    mockRateLimit.mockReturnValue({ ok: false, retryAfterSec: 60 });
    const request = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "admin", password: "x" }),
    });
    expect((await POST(request)).status).toBe(429);
  });
});
