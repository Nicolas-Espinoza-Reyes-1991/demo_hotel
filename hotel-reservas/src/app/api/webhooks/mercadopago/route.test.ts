import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockSync, mockVerify, mockConfigured } = vi.hoisted(() => ({
  mockSync: vi.fn().mockResolvedValue(undefined),
  mockVerify: vi.fn().mockReturnValue(true),
  mockConfigured: vi.fn().mockReturnValue(true),
}));

vi.mock("@/lib/mercadopago", () => ({
  isMercadoPagoConfigured: mockConfigured,
  syncMercadoPagoPayment: mockSync,
}));
vi.mock("@/lib/mercadopago-webhook", () => ({
  verifyMercadoPagoWebhookSignature: mockVerify,
}));

import { GET, POST } from "./route";

describe("/api/webhooks/mercadopago", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  // Happy path: webhook de pago sincroniza estado.
  it("POST procesa notificación de pago válida", async () => {
    const request = new NextRequest("http://localhost/api/webhooks/mercadopago", {
      method: "POST",
      body: JSON.stringify({ type: "payment", data: { id: 999 } }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.received).toBe(true);
    expect(mockSync).toHaveBeenCalledWith("999");
  });

  // MP no configurado: ack sin procesar.
  it("retorna received false si MP no está configurado", async () => {
    mockConfigured.mockReturnValueOnce(false);
    const response = await POST(
      new NextRequest("http://localhost/api/webhooks/mercadopago", {
        method: "POST",
        body: JSON.stringify({}),
      })
    );
    const body = await response.json();
    expect(body.received).toBe(false);
  });

  // Firma inválida retorna 401.
  it("rechaza webhook con firma inválida", async () => {
    mockVerify.mockReturnValueOnce(false);
    const response = await POST(
      new NextRequest("http://localhost/api/webhooks/mercadopago", {
        method: "POST",
        body: JSON.stringify({ type: "payment", data: { id: 1 } }),
      })
    );
    expect(response.status).toBe(401);
  });

  // GET no permitido.
  it("GET responde 405", async () => {
    expect((await GET(new NextRequest("http://localhost"))).status).toBe(405);
  });
});
