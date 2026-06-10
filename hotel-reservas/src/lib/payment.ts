import { PaymentStatus, ReservationStatus } from "@prisma/client";
import { checkRoomAvailability } from "./availability";
import { buildReservationEmailPayload, sendReservationPaidEmail } from "./email";
import prisma from "./prisma";
import { assertReservationPayable } from "./reservation-holds";

export type PaymentResult = {
  success: boolean;
  transactionId: string;
  paymentStatus: PaymentStatus;
  message: string;
  provider: "SIMULATED" | "MERCADO_PAGO" | "BANK_TRANSFER";
};

async function notifyPaidReservation(reservationId: string): Promise<void> {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { room: true, guest: true },
  });
  if (!reservation || reservation.paymentStatus !== PaymentStatus.PAID) return;

  void sendReservationPaidEmail(buildReservationEmailPayload(reservation));
}

async function assertReservationStillAvailable(reservation: {
  id: string;
  roomId: string;
  checkIn: Date;
  checkOut: Date;
}) {
  const availability = await checkRoomAvailability(
    reservation.roomId,
    reservation.checkIn,
    reservation.checkOut,
    reservation.id
  );

  if (!availability.available) {
    throw new Error(
      availability.conflicts[0]?.message ??
        "La habitación ya no está disponible para completar el pago."
    );
  }
}

/** Simula pasarela de pago (solo desarrollo). */
export async function processSimulatedPayment(
  reservationId: string,
  options?: { cardLast4?: string }
): Promise<PaymentResult> {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { room: true, guest: true },
  });

  if (!reservation) {
    throw new Error("Reserva no encontrada.");
  }

  assertReservationPayable(reservation);

  if (reservation.paymentStatus === PaymentStatus.PAID) {
    return {
      success: true,
      transactionId: `TX-${reservation.confirmationCode.slice(0, 8).toUpperCase()}`,
      paymentStatus: PaymentStatus.PAID,
      message: "El pago ya fue registrado.",
      provider: reservation.paymentProvider === "MERCADO_PAGO" ? "MERCADO_PAGO" : "SIMULATED",
    };
  }

  await assertReservationStillAvailable(reservation);

  await new Promise((resolve) => setTimeout(resolve, 600));

  const transactionId = `TX-${Date.now().toString(36).toUpperCase()}${options?.cardLast4 ? `-${options.cardLast4}` : ""}`;

  await prisma.reservation.update({
    where: { id: reservationId },
    data: {
      paymentStatus: PaymentStatus.PAID,
      status: ReservationStatus.CONFIRMED,
      paymentProvider: "SIMULATED",
      expiresAt: null,
    },
  });

  void notifyPaidReservation(reservationId);

  return {
    success: true,
    transactionId,
    paymentStatus: PaymentStatus.PAID,
    message: "Pago simulado procesado correctamente.",
    provider: "SIMULATED",
  };
}

/** @deprecated Usar processSimulatedPayment o createMercadoPagoPayment */
export async function processAutomaticPayment(
  reservationId: string,
  options?: { cardLast4?: string }
): Promise<PaymentResult> {
  return processSimulatedPayment(reservationId, options);
}
