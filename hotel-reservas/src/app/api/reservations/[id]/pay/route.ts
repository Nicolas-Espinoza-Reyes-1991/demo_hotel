import { NextRequest } from "next/server";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-response";
import { processBankTransferPayment } from "@/lib/bank-transfer";
import { createMercadoPagoPayment, isMercadoPagoConfigured } from "@/lib/mercadopago";
import { processSimulatedPayment } from "@/lib/payment";
import prisma from "@/lib/prisma";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { isSimulatedPaymentAllowed } from "@/lib/reservation-holds";
import { processPaymentSchema } from "@/lib/validations";

type RouteParams = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

/**
 * POST /api/reservations/[id]/pay
 * Procesa pago online (Mercado Pago / demo) o reserva por transferencia bancaria.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const ip = getClientIp(request);
    const limited = rateLimit(`pay:${ip}`, 20, 60_000);
    if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

    const { id } = await params;
    const body = await request.json();
    const parsed = processPaymentSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Datos de pago inválidos.", 400, parsed.error.flatten());
    }

    let payment;

    if (parsed.data.provider === "mercadopago") {
      if (!isMercadoPagoConfigured()) {
        return jsonError("Mercado Pago no está configurado.", 503, undefined, "MP_NOT_CONFIGURED");
      }

      payment = await createMercadoPagoPayment(id, parsed.data.formData);
    } else if (parsed.data.provider === "bank_transfer") {
      payment = await processBankTransferPayment(id);
    } else {
      if (isMercadoPagoConfigured() || !isSimulatedPaymentAllowed()) {
        return jsonError(
          "El pago simulado está deshabilitado. Usa Mercado Pago o transferencia.",
          400,
          undefined,
          "SIMULATED_DISABLED"
        );
      }

      const cardDigits = parsed.data.payment.cardNumber.replace(/\D/g, "");
      payment = await processSimulatedPayment(id, {
        cardLast4: cardDigits.slice(-4),
      });
    }
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: { room: true, guest: true },
    });

    if (!reservation) {
      return jsonError("Reserva no encontrada.", 404);
    }

    return jsonOk({
      message: payment.message,
      transactionId: payment.transactionId,
      paymentStatus: payment.paymentStatus,
      provider: payment.provider,
      reservation: {
        ...reservation,
        pricePerNight: Number(reservation.pricePerNight),
        totalAmount: Number(reservation.totalAmount),
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      return jsonError(error.message, 400);
    }
    return handleApiError(error);
  }
}
