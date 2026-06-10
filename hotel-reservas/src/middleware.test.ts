import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockVerifySession } = vi.hoisted(() => ({
  mockVerifySession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  SESSION_COOKIE: "hotel_session",
  verifySessionToken: mockVerifySession,
}));

import { middleware } from "./middleware";

function request(path: string, cookie?: string, method = "GET") {
  const headers = new Headers();
  if (cookie) headers.set("cookie", `hotel_session=${cookie}`);
  return new NextRequest(`http://localhost:3000${path}`, { method, headers });
}

describe("middleware — rutas protegidas", () => {
  beforeEach(() => {
    mockVerifySession.mockReset();
  });

  // Rutas públicas de auth deben pasar sin cookie.
  it("permite acceso a /login sin sesión", async () => {
    const response = await middleware(request("/login"));
    expect(response.status).toBe(200);
    expect(mockVerifySession).not.toHaveBeenCalled();
  });

  // API pública de habitaciones para la landing no requiere auth.
  it("permite GET /api/public/rooms sin sesión", async () => {
    const response = await middleware(request("/api/public/rooms"));
    expect(response.status).toBe(200);
  });

  // Seguridad: /admin sin cookie redirige a login.
  it("redirige /admin a /login sin cookie hotel_session", async () => {
    const response = await middleware(request("/admin"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login");
    expect(response.headers.get("location")).toContain("callbackUrl=%2Fadmin");
  });

  // Seguridad: JWT inválido en cookie rechaza API admin.
  it("responde 401 en API protegida con JWT inválido", async () => {
    mockVerifySession.mockResolvedValue(null);

    const response = await middleware(request("/api/calendar", "token-invalido"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toMatch(/no autorizado/i);
  });

  // Happy path: sesión válida permite acceso al calendario admin.
  it("permite acceso con sesión admin válida", async () => {
    mockVerifySession.mockResolvedValue({ username: "admin", role: "admin" });

    const response = await middleware(request("/api/calendar", "valid-jwt"));

    expect(response.status).toBe(200);
    expect(mockVerifySession).toHaveBeenCalledWith("valid-jwt");
  });

  // Webhooks de Mercado Pago deben ser públicos (sin cookie).
  it("permite webhooks de Mercado Pago sin autenticación", async () => {
    const response = await middleware(request("/api/webhooks/mercadopago", undefined, "POST"));
    expect(response.status).toBe(200);
  });
});
