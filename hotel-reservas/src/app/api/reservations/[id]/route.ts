import { NextRequest } from "next/server";
import { PaymentStatus, ReservationStatus } from "@prisma/client";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-response";
import { buildReservationEmailPayload, sendReservationPaidEmail } from "@/lib/email";
import prisma from "@/lib/prisma";
import { updateReservationSchema } from "@/lib/validations";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/reservations/[id]
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: { room: true, guest: true },
    });

    if (!reservation) {
      return jsonError("Reserva no encontrada.", 404);
    }

    return jsonOk({
      reservation: {
        ...reservation,
        pricePerNight: Number(reservation.pricePerNight),
        totalAmount: Number(reservation.totalAmount),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/reservations/[id]
 * Cambio manual de estado de pago o reserva (admin).
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateReservationSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Datos inválidos.", 400, parsed.error.flatten());
    }

    const current = await prisma.reservation.findUnique({ where: { id } });
    if (!current) {
      return jsonError("Reserva no encontrada.", 404);
    }

    const { paymentStatus, status } = parsed.data;

    let nextPaymentStatus = paymentStatus;
    if (status === ReservationStatus.CANCELLED && current.paymentStatus === PaymentStatus.PAID && !paymentStatus) {
      nextPaymentStatus = PaymentStatus.REFUNDED;
    }

    const reservation = await prisma.reservation.update({
      where: { id },
      data: {
        ...(nextPaymentStatus ? { paymentStatus: nextPaymentStatus } : {}),
        ...(status ? { status } : {}),
        ...(nextPaymentStatus === PaymentStatus.PAID ? { expiresAt: null } : {}),
      },
      include: { room: true, guest: true },
    });

    const becamePaid =
      nextPaymentStatus === PaymentStatus.PAID && current.paymentStatus !== PaymentStatus.PAID;

    if (becamePaid) {
      void sendReservationPaidEmail(buildReservationEmailPayload(reservation));
    }

    return jsonOk({
      message: "Reserva actualizada.",
      reservation: {
        ...reservation,
        pricePerNight: Number(reservation.pricePerNight),
        totalAmount: Number(reservation.totalAmount),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
