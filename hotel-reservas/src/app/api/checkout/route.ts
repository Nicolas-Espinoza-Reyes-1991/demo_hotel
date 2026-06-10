import { NextRequest } from "next/server";
import { checkRoomAvailability } from "@/lib/availability";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-response";
import { createCheckoutToken } from "@/lib/checkout-token";
import { toDateOnly } from "@/lib/dates";
import prisma from "@/lib/prisma";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { expireStaleHoldReservations } from "@/lib/reservation-holds";
import { createReservationSchema } from "@/lib/validations";

/**
 * POST /api/checkout
 * Valida disponibilidad y devuelve un token firmado. No crea reserva en BD.
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const limited = rateLimit(`checkout:${ip}`, 15, 60_000);
    if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

    await expireStaleHoldReservations();

    const body = await request.json();
    const parsed = createReservationSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Datos de reserva inválidos.", 400, parsed.error.flatten());
    }

    const { roomId, checkIn, checkOut, guestsCount, guest, specialRequests } = parsed.data;
    const checkInDate = toDateOnly(checkIn);
    const checkOutDate = toDateOnly(checkOut);

    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      return jsonError("Habitación no encontrada.", 404);
    }

    if (guestsCount > room.maxGuests) {
      return jsonError(`Esta habitación admite máximo ${room.maxGuests} huéspedes.`, 400);
    }

    const availability = await checkRoomAvailability(roomId, checkInDate, checkOutDate);
    if (!availability.available) {
      const conflict = availability.conflicts[0];
      return jsonError(
        conflict?.message ?? "Habitación no disponible para esas fechas.",
        409,
        undefined,
        "NOT_AVAILABLE"
      );
    }

    const checkoutToken = await createCheckoutToken({
      roomId,
      checkIn,
      checkOut,
      guestsCount,
      guest,
      specialRequests,
    });

    return jsonOk({
      message: "Disponibilidad confirmada. Completa el pago para confirmar tu reserva.",
      checkoutToken,
      quote: {
        nights: availability.nights,
        totalAmount: availability.totalAmount,
        pricePerNight: Number(room.pricePerNight),
        room: {
          id: room.id,
          code: room.code,
          name: room.name,
        },
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
