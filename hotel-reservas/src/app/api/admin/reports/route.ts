import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-response";
import { buildAdminReports } from "@/lib/admin-reports";
import { formatDateOnlyUTC, toDateOnly } from "@/lib/dates";
import prisma from "@/lib/prisma";

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const reportsQuerySchema = z
  .object({
    from: dateOnly,
    to: dateOnly,
  })
  .refine((data) => data.to >= data.from, {
    message: "La fecha hasta debe ser posterior o igual a desde.",
    path: ["to"],
  });

function defaultMonthRange() {
  const now = new Date();
  const from = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 12));
  const to = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 12));
  return {
    from: formatDateOnlyUTC(from),
    to: formatDateOnlyUTC(to),
  };
}

/**
 * GET /api/admin/reports?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Resumen de ocupación, ingresos, ranking y saldos del período.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const defaults = defaultMonthRange();
    const parsed = reportsQuerySchema.safeParse({
      from: searchParams.get("from") ?? defaults.from,
      to: searchParams.get("to") ?? defaults.to,
    });

    if (!parsed.success) {
      return jsonError("Parámetros de reporte inválidos.", 400, parsed.error.flatten());
    }

    const from = parsed.data.from;
    const to = parsed.data.to;
    const fromDate = toDateOnly(from);
    const toExclusive = toDateOnly(to);
    toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);

    // Traemos reservas que se crearon en el rango o cuya estadía solapa el período.
    const [rooms, reservations] = await Promise.all([
      prisma.room.findMany({
        select: { id: true, code: true, name: true },
        orderBy: [{ floor: "asc" }, { code: "asc" }],
      }),
      prisma.reservation.findMany({
        where: {
          OR: [
            {
              createdAt: {
                gte: toDateOnly(from),
                lt: toExclusive,
              },
            },
            {
              checkIn: { lt: toExclusive },
              checkOut: { gt: fromDate },
            },
          ],
        },
        include: {
          room: { select: { code: true, name: true } },
        },
        orderBy: { checkIn: "asc" },
      }),
    ]);

    const report = buildAdminReports({
      from,
      to,
      roomCount: rooms.length,
      rooms,
      reservations: reservations.map((reservation) => ({
        id: reservation.id,
        confirmationCode: reservation.confirmationCode,
        roomId: reservation.roomId,
        roomCode: reservation.room.code,
        roomName: reservation.room.name,
        guestFullName: reservation.guestFullName,
        checkIn: reservation.checkIn,
        checkOut: reservation.checkOut,
        nights: reservation.nights,
        totalAmount: Number(reservation.totalAmount),
        amountPaid: Number(reservation.amountPaid),
        paymentStatus: reservation.paymentStatus,
        paymentProvider: reservation.paymentProvider,
        status: reservation.status,
        createdAt: reservation.createdAt,
      })),
    });

    return jsonOk(report);
  } catch (error) {
    if (error instanceof Error && error.message.includes("fecha")) {
      return jsonError(error.message, 400);
    }
    return handleApiError(error);
  }
}
