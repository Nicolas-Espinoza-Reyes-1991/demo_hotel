import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-response";
import { formatDateOnlyUTC, formatStayRange } from "@/lib/dates";
import { paymentStatusLabel } from "@/lib/reservation-history";
import prisma from "@/lib/prisma";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const lookupSchema = z.object({
  confirmationCode: z.string().trim().min(4).max(40),
  email: z.string().trim().email("Email inválido."),
});

/**
 * POST /api/public/reservations/lookup
 * Consulta pública de reserva por código + email.
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const limited = rateLimit(`reservation-lookup:${ip}`, 10, 60_000);
    if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

    const body = await request.json();
    const parsed = lookupSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Datos inválidos.", 400, parsed.error.flatten());
    }

    const code = parsed.data.confirmationCode.trim().toUpperCase();
    const email = parsed.data.email.trim().toLowerCase();

    const reservation = await prisma.reservation.findFirst({
      where: {
        confirmationCode: { equals: code, mode: "insensitive" },
        guest: { email: { equals: email, mode: "insensitive" } },
      },
      include: {
        room: { select: { code: true, name: true } },
        guest: { select: { email: true, fullName: true } },
      },
    });

    if (!reservation) {
      return jsonError(
        "No encontramos una reserva con ese código y email. Verificá los datos o contáctanos por WhatsApp.",
        404,
        undefined,
        "NOT_FOUND"
      );
    }

    return jsonOk({
      reservation: {
        confirmationCode: reservation.confirmationCode,
        guestName: reservation.guestFullName,
        roomCode: reservation.room.code,
        roomName: reservation.room.name,
        checkIn: formatDateOnlyUTC(reservation.checkIn),
        checkOut: formatDateOnlyUTC(reservation.checkOut),
        stayLabel: formatStayRange(
          formatDateOnlyUTC(reservation.checkIn),
          formatDateOnlyUTC(reservation.checkOut)
        ),
        nights: reservation.nights,
        guestsCount: reservation.guestsCount,
        totalAmount: Number(reservation.totalAmount),
        paymentStatus: reservation.paymentStatus,
        paymentStatusLabel: paymentStatusLabel(reservation.paymentStatus),
        status: reservation.status,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
