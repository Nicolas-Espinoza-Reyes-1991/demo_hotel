import { NextRequest } from "next/server";
import { PaymentStatus, ReservationStatus } from "@prisma/client";
import { AppError, handleApiError, jsonError, jsonOk } from "@/lib/api-response";
import { requireSession } from "@/lib/auth";
import { buildReservationEmailPayload, sendReservationPaidEmail } from "@/lib/email";
import prisma from "@/lib/prisma";
import { buildDiscountUpdate, serializeReservationMoney } from "@/lib/reservation-discount";
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
        ...serializeReservationMoney(reservation),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/reservations/[id]
 * Cambio manual de estado de pago/reserva o descuento (admin/staff).
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSession();
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

    const { paymentStatus, status, totalAmount, discountReason, clearDiscount } = parsed.data;

    let nextPaymentStatus = paymentStatus;
    if (status === ReservationStatus.CANCELLED && current.paymentStatus === PaymentStatus.PAID && !paymentStatus) {
      nextPaymentStatus = PaymentStatus.REFUNDED;
    }

    const wantsDiscount =
      clearDiscount === true || totalAmount !== undefined;

    let discountData: ReturnType<typeof buildDiscountUpdate> | null = null;
    if (wantsDiscount) {
      discountData = buildDiscountUpdate(current, {
        chargedAmount: totalAmount ?? Number(current.totalAmount),
        reason: discountReason,
        clearDiscount: clearDiscount === true,
        appliedBy: session.username,
      });
    }

    const reservation = await prisma.reservation.update({
      where: { id },
      data: {
        ...(nextPaymentStatus ? { paymentStatus: nextPaymentStatus } : {}),
        ...(status ? { status } : {}),
        ...(nextPaymentStatus === PaymentStatus.PAID ? { expiresAt: null } : {}),
        ...(discountData
          ? {
              listTotalAmount: discountData.listTotalAmount,
              totalAmount: discountData.totalAmount,
              discountReason: discountData.discountReason,
              discountAppliedAt: discountData.discountAppliedAt,
              discountAppliedBy: discountData.discountAppliedBy,
            }
          : {}),
      },
      include: { room: true, guest: true },
    });

    const becamePaid =
      nextPaymentStatus === PaymentStatus.PAID && current.paymentStatus !== PaymentStatus.PAID;

    if (becamePaid) {
      void sendReservationPaidEmail(buildReservationEmailPayload(reservation));
    }

    const money = serializeReservationMoney(reservation);
    const message = discountData
      ? money.hasDiscount
        ? "Descuento aplicado."
        : "Descuento quitado. Se restauró el precio de lista."
      : "Reserva actualizada.";

    return jsonOk({
      message,
      reservation: {
        ...reservation,
        ...money,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return jsonError(error.message, error.status, undefined, error.code);
    }
    return handleApiError(error);
  }
}
