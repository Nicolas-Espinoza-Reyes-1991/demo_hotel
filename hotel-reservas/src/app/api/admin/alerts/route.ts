import { NextRequest } from "next/server";
import { ReservationStatus } from "@prisma/client";
import { z } from "zod";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-response";
import prisma from "@/lib/prisma";

const querySchema = z.object({
  since: z.string().min(10).max(40),
  limit: z.coerce.number().int().min(1).max(30).optional().default(15),
});

/**
 * GET /api/admin/alerts?since=ISO&limit=15
 * Reservas nuevas para la campana del panel (polling).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      since: searchParams.get("since") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    if (!parsed.success) {
      return jsonError("Parámetro since inválido (ISO 8601).", 400, parsed.error.flatten());
    }

    const sinceDate = new Date(parsed.data.since);
    if (Number.isNaN(sinceDate.getTime())) {
      return jsonError("Parámetro since inválido.", 400);
    }

    const reservations = await prisma.reservation.findMany({
      where: {
        createdAt: { gt: sinceDate },
        status: { not: ReservationStatus.CANCELLED },
      },
      include: {
        room: { select: { code: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: parsed.data.limit,
    });

    return jsonOk({
      serverTime: new Date().toISOString(),
      alerts: reservations.map((r) => ({
        id: r.id,
        confirmationCode: r.confirmationCode,
        guestFullName: r.guestFullName,
        roomCode: r.room.code,
        roomName: r.room.name,
        checkIn: r.checkIn.toISOString(),
        checkOut: r.checkOut.toISOString(),
        paymentStatus: r.paymentStatus,
        status: r.status,
        totalAmount: Number(r.totalAmount),
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
