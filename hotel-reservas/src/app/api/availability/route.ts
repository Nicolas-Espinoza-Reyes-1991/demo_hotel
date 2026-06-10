import { NextRequest } from "next/server";
import { findAvailableRooms, getAvailabilityEmptyContext } from "@/lib/availability";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-response";
import { calculateNights, toDateOnly } from "@/lib/dates";
import { availabilityQuerySchema } from "@/lib/validations";

/**
 * GET /api/availability?checkIn=2026-06-10&checkOut=2026-06-15&guests=2
 *
 * Motor de disponibilidad: devuelve habitaciones libres para el rango solicitado.
 * Valida solapamientos en servidor antes de responder.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = availabilityQuerySchema.safeParse({
      checkIn: searchParams.get("checkIn"),
      checkOut: searchParams.get("checkOut"),
      guests: searchParams.get("guests") ?? undefined,
      type: searchParams.get("type") ?? undefined,
    });

    if (!parsed.success) {
      return jsonError("Parámetros inválidos.", 400, parsed.error.flatten());
    }

    const { checkIn, checkOut, guests, type } = parsed.data;
    const nights = calculateNights(toDateOnly(checkIn), toDateOnly(checkOut));

    if (nights <= 0) {
      return jsonError("La fecha de salida debe ser posterior al check-in.", 400);
    }

    const rooms = await findAvailableRooms({ checkIn, checkOut, guests, type });

    const emptyContext =
      rooms.length === 0 ? await getAvailabilityEmptyContext(guests) : null;

    return jsonOk({
      checkIn,
      checkOut,
      nights,
      guests,
      count: rooms.length,
      rooms,
      ...(emptyContext ?? {}),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
