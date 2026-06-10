import { NextRequest } from "next/server";
import { processBankTransferPayment } from "@/lib/bank-transfer";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-response";
import { verifyCheckoutToken } from "@/lib/checkout-token";
import { createReservationFromCheckout } from "@/lib/create-reservation";
import { createMercadoPagoPayment, isMercadoPagoConfigured } from "@/lib/mercadopago";
import { processSimulatedPayment } from "@/lib/payment";
import prisma from "@/lib/prisma";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { expireStaleHoldReservations, isSimulatedPaymentAllowed } from "@/lib/reservation-holds";
import { processPaymentSchema } from "@/lib/validations";
import { z } from "zod";

export const runtime = "nodejs";

const checkoutPaySchema = z
  .object({
    checkoutToken: z.string().min(1),
  })
  .and(processPaymentSchema);

/**
 * POST /api/checkout/pay
 * Crea la reserva y procesa el pago en un solo paso (la reserva solo existe tras confirmar).
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const limited = rateLimit(`checkout-pay:${ip}`, 20, 60_000);
    if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

    await expireStaleHoldReservations();

    const body = await request.json();
    const parsed = checkoutPaySchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Datos de pago inválidos.", 400, parsed.error.flatten());
    }

    const { checkoutToken, ...paymentInput } = parsed.data;

    let checkoutPayload;
    try {
      checkoutPayload = await verifyCheckoutToken(checkoutToken);
    } catch {
      return jsonError(
        "La sesión de pago expiró. Vuelve a buscar disponibilidad e intenta de nuevo.",
        410,
        undefined,
        "CHECKOUT_EXPIRED"
      );
    }

    const reservation = await prisma.$transaction(
      async (tx) => createReservationFromCheckout(tx, checkoutPayload),
      {
        isolationLevel: "Serializable",
        maxWait: 5000,
        timeout: 10000,
      }
    );

    let payment;

    if (paymentInput.provider === "mercadopago") {
      if (!isMercadoPagoConfigured()) {
        return jsonError("Mercado Pago no está configurado.", 503, undefined, "MP_NOT_CONFIGURED");
      }
      payment = await createMercadoPagoPayment(reservation.id, paymentInput.formData);
    } else if (paymentInput.provider === "bank_transfer") {
      payment = await processBankTransferPayment(reservation.id);
    } else {
      if (isMercadoPagoConfigured() || !isSimulatedPaymentAllowed()) {
        return jsonError(
          "El pago simulado está deshabilitado. Usa Mercado Pago o transferencia.",
          400,
          undefined,
          "SIMULATED_DISABLED"
        );
      }

      const cardDigits = paymentInput.payment.cardNumber.replace(/\D/g, "");
      payment = await processSimulatedPayment(reservation.id, {
        cardLast4: cardDigits.slice(-4),
      });
    }

    const updated = await prisma.reservation.findUnique({
      where: { id: reservation.id },
      include: { room: true, guest: true },
    });

    if (!updated) {
      return jsonError("Reserva no encontrada.", 404);
    }

    return jsonOk({
      message: payment.message,
      transactionId: payment.transactionId,
      paymentStatus: payment.paymentStatus,
      provider: payment.provider,
      reservation: {
        ...updated,
        pricePerNight: Number(updated.pricePerNight),
        totalAmount: Number(updated.totalAmount),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("no disponible")) {
      return jsonError(error.message, 409, undefined, "NOT_AVAILABLE");
    }
    if (error instanceof Error && error.message.includes("huéspedes")) {
      return jsonError(error.message, 400);
    }
    if (error instanceof Error) {
      return jsonError(error.message, 400);
    }
    return handleApiError(error);
  }
}
