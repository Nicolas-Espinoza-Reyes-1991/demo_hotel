import { NextRequest } from "next/server";
import { jsonOk } from "@/lib/api-response";
import { isMercadoPagoConfigured, syncMercadoPagoPayment } from "@/lib/mercadopago";
import { verifyMercadoPagoWebhookSignature } from "@/lib/mercadopago-webhook";

export const runtime = "nodejs";

type MercadoPagoWebhookBody = {
  type?: string;
  action?: string;
  data?: {
    id?: string | number;
  };
};

/**
 * POST /api/webhooks/mercadopago
 * Recibe notificaciones de Mercado Pago y sincroniza el estado del pago.
 */
export async function POST(request: NextRequest) {
  if (!isMercadoPagoConfigured()) {
    return jsonOk({ received: false, reason: "not_configured" });
  }

  try {
    const body = (await request.json()) as MercadoPagoWebhookBody;
    const topic = body.type ?? request.nextUrl.searchParams.get("topic");
    const paymentId = body.data?.id ?? request.nextUrl.searchParams.get("id");

    if (!verifyMercadoPagoWebhookSignature(request, paymentId ? String(paymentId) : null)) {
      return Response.json({ error: "Firma inválida." }, { status: 401 });
    }

    if ((topic === "payment" || body.action?.startsWith("payment.")) && paymentId) {
      await syncMercadoPagoPayment(String(paymentId));
    }

    return jsonOk({ received: true });
  } catch (error) {
    console.error("[Mercado Pago Webhook]", error);
    return Response.json({ error: "No se pudo procesar el webhook." }, { status: 500 });
  }
}

export async function GET(_request: NextRequest) {
  return Response.json({ error: "Método no permitido." }, { status: 405 });
}
