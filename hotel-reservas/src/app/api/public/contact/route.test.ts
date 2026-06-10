import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/email", () => ({
  sendContactEmail: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  getClientIp: vi.fn(() => "127.0.0.1"),
  rateLimit: vi.fn(() => ({ ok: true })),
  rateLimitResponse: vi.fn((retryAfterSec: number) =>
    new Response(JSON.stringify({ error: "rate limited" }), {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    })
  ),
}));

import { sendContactEmail } from "@/lib/email";
import { OPTIONS, POST } from "./route";

const validPayload = {
  name: "María Pérez",
  email: "maria@example.com",
  phone: "+56912345678",
  subject: "reserva",
  message: "Quisiera consultar disponibilidad para julio.",
};

describe("/api/public/contact", () => {
  beforeEach(() => {
    vi.mocked(sendContactEmail).mockReset();
    vi.mocked(sendContactEmail).mockResolvedValue(true);
  });

  it("OPTIONS responde 204 con headers CORS", async () => {
    const response = await OPTIONS();
    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("POST envía contacto válido", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/public/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validPayload),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(sendContactEmail).toHaveBeenCalledWith({
      name: validPayload.name,
      email: validPayload.email,
      phone: validPayload.phone,
      subject: validPayload.subject,
      message: validPayload.message,
    });
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("rechaza datos inválidos", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/public/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...validPayload, email: "no-es-email" }),
      })
    );

    expect(response.status).toBe(400);
    expect(sendContactEmail).not.toHaveBeenCalled();
  });

  it("ignora honeypot con respuesta exitosa", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/public/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...validPayload, website: "spam-bot" }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(sendContactEmail).not.toHaveBeenCalled();
  });
});
