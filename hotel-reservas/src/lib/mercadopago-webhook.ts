import crypto from "node:crypto";
import { NextRequest } from "next/server";

function getWebhookSecret(): string | null {
  return process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim() || null;
}

/** Valida firma x-signature de Mercado Pago. En producción exige secreto configurado. */
export function verifyMercadoPagoWebhookSignature(
  request: NextRequest,
  dataId?: string | null
): boolean {
  const secret = getWebhookSecret();
  if (!secret) return process.env.NODE_ENV !== "production";

  const signatureHeader = request.headers.get("x-signature");
  const requestId = request.headers.get("x-request-id");
  if (!signatureHeader || !dataId) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const [key, value] = part.trim().split("=");
      return [key, value];
    })
  );

  const ts = parts.ts;
  const receivedHash = parts.v1;
  if (!ts || !receivedHash) return false;

  const manifest = `id:${dataId};request-id:${requestId ?? ""};ts:${ts};`;
  const expectedHash = crypto.createHmac("sha256", secret).update(manifest).digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(receivedHash), Buffer.from(expectedHash));
  } catch {
    return false;
  }
}
