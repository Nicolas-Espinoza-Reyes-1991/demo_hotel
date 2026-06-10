import crypto from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { verifyMercadoPagoWebhookSignature } from "./mercadopago-webhook";

describe("verifyMercadoPagoWebhookSignature", () => {
  const secret = "webhook-secret-test";

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function signedRequest(dataId: string, requestId = "req-1") {
    const ts = String(Math.floor(Date.now() / 1000));
    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
    const hash = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
    return new NextRequest("http://localhost/api/webhooks/mercadopago", {
      method: "POST",
      headers: {
        "x-signature": `ts=${ts},v1=${hash}`,
        "x-request-id": requestId,
      },
    });
  }

  // Happy path: firma HMAC válida es aceptada.
  it("acepta firma válida con secreto configurado", () => {
    vi.stubEnv("MERCADOPAGO_WEBHOOK_SECRET", secret);
    vi.stubEnv("NODE_ENV", "production");
    const request = signedRequest("12345");
    expect(verifyMercadoPagoWebhookSignature(request, "12345")).toBe(true);
  });

  // Seguridad: firma inválida es rechazada en producción.
  it("rechaza firma inválida en producción", () => {
    vi.stubEnv("MERCADOPAGO_WEBHOOK_SECRET", secret);
    vi.stubEnv("NODE_ENV", "production");
    const request = new NextRequest("http://localhost", {
      headers: { "x-signature": "ts=1,v1=badhash" },
    });
    expect(verifyMercadoPagoWebhookSignature(request, "12345")).toBe(false);
  });

  // Sin secreto en desarrollo permite pasar (modo permisivo).
  it("permite webhook sin secreto en development", () => {
    vi.stubEnv("MERCADOPAGO_WEBHOOK_SECRET", "");
    vi.stubEnv("NODE_ENV", "development");
    const request = new NextRequest("http://localhost");
    expect(verifyMercadoPagoWebhookSignature(request, "1")).toBe(true);
  });

  // Edge case: dataId ausente falla verificación con secreto.
  it("rechaza si falta dataId con secreto configurado", () => {
    vi.stubEnv("MERCADOPAGO_WEBHOOK_SECRET", secret);
    vi.stubEnv("NODE_ENV", "production");
    const request = signedRequest("12345");
    expect(verifyMercadoPagoWebhookSignature(request, null)).toBe(false);
  });
});
