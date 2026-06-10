import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { getClientIp, rateLimit, rateLimitResponse } from "./rate-limit";

describe("rate-limit", () => {
  // Happy path: primera solicitud dentro del bucket es permitida.
  it("permite solicitudes dentro del límite", () => {
    const key = `test-allow-${Date.now()}`;
    expect(rateLimit(key, 3, 60_000)).toEqual({ ok: true });
  });

  // Edge case: exceder el límite retorna retryAfterSec.
  it("bloquea cuando se supera el límite por ventana", () => {
    const key = `test-block-${Date.now()}`;
    expect(rateLimit(key, 2, 60_000)).toEqual({ ok: true });
    expect(rateLimit(key, 2, 60_000)).toEqual({ ok: true });
    const blocked = rateLimit(key, 2, 60_000);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.retryAfterSec).toBeGreaterThan(0);
    }
  });

  // getClientIp extrae IP desde x-forwarded-for.
  it("getClientIp lee x-forwarded-for", () => {
    const request = new NextRequest("http://localhost", {
      headers: { "x-forwarded-for": "203.0.113.50, 70.41.3.18" },
    });
    expect(getClientIp(request)).toBe("203.0.113.50");
  });

  // rateLimitResponse retorna 429 con Retry-After.
  it("rateLimitResponse responde 429 con header Retry-After", async () => {
    const response = rateLimitResponse(30);
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("30");
    const body = await response.json();
    expect(body.error).toMatch(/demasiadas/i);
  });
});
