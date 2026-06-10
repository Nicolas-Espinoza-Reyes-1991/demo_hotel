import { NextRequest } from "next/server";
import { z } from "zod";
import { checkRoomAvailability } from "@/lib/availability";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-response";
import { toDateOnly } from "@/lib/dates";

type RouteParams = { params: Promise<{ id: string }> };

const validateReservationSchema = z
  .object({
    roomId: z.string().min(1),
    checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .refine((data) => data.checkOut > data.checkIn, {
    message: "La fecha de salida debe ser posterior al check-in.",
    path: ["checkOut"],
  });

/**
 * POST /api/reservations/[id]/validate
 * Re-valida disponibilidad antes de modificar fechas.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = validateReservationSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Datos de validación inválidos.", 400, parsed.error.flatten());
    }

    const { checkIn, checkOut, roomId } = parsed.data;

    const result = await checkRoomAvailability(
      roomId,
      toDateOnly(checkIn),
      toDateOnly(checkOut),
      id
    );

    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}
