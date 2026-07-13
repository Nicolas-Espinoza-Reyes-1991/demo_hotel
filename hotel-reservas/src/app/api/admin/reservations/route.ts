import { NextRequest } from "next/server";
import { PaymentStatus } from "@prisma/client";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-response";
import { requireSession } from "@/lib/auth";
import { createWalkInReservation } from "@/lib/create-reservation";
import { buildReservationEmailPayload, sendReservationPaidEmail } from "@/lib/email";
import prisma from "@/lib/prisma";
import { serializeReservationMoney } from "@/lib/reservation-discount";
import { createAdminReservationSchema } from "@/lib/validations";

/**
 * POST /api/admin/reservations
 * Alta walk-in / teléfono desde el panel (staff autenticado).
 */
export async function POST(request: NextRequest) {
  try {
    await requireSession();
    const body = await request.json();
    const parsed = createAdminReservationSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Datos inválidos.", 400, parsed.error.flatten());
    }

    const payload = parsed.data;

    const reservation = await prisma.$transaction(
      (tx) =>
        createWalkInReservation(tx, {
          roomId: payload.roomId,
          checkIn: payload.checkIn,
          checkOut: payload.checkOut,
          guestsCount: payload.guestsCount,
          guest: payload.guest,
          specialRequests: payload.specialRequests,
          paymentOutcome: payload.paymentOutcome,
        }),
      {
        isolationLevel: "Serializable",
        maxWait: 5000,
        timeout: 10000,
      }
    );

    if (reservation.paymentStatus === PaymentStatus.PAID) {
      void sendReservationPaidEmail(buildReservationEmailPayload(reservation));
    }

    return jsonOk(
      {
        message: `Reserva ${reservation.confirmationCode} creada.`,
        reservation: {
          ...reservation,
          ...serializeReservationMoney(reservation),
        },
      },
      201
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("no disponible")) {
      return jsonError(error.message, 409, undefined, "NOT_AVAILABLE");
    }
    if (error instanceof Error && error.message.includes("huéspedes")) {
      return jsonError(error.message, 400);
    }
    if (error instanceof Error && error.message.includes("no encontrada")) {
      return jsonError(error.message, 404);
    }
    return handleApiError(error);
  }
}
