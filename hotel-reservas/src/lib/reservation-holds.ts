import { PaymentStatus, Prisma, ReservationStatus } from "@prisma/client";
import prisma from "./prisma";

type DbClient = Prisma.TransactionClient | typeof prisma;

export function getReservationHoldMinutes(): number {
  const value = Number(process.env.RESERVATION_HOLD_MINUTES ?? "30");
  return Number.isFinite(value) && value > 0 ? value : 30;
}

export function computeHoldExpiresAt(holdMinutes?: number): Date {
  const minutes = holdMinutes ?? getReservationHoldMinutes();
  return new Date(Date.now() + minutes * 60 * 1000);
}

export function computeBankTransferExpiresAt(deadlineHours: number): Date {
  const hours = Number.isFinite(deadlineHours) && deadlineHours > 0 ? deadlineHours : 48;
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

/** Cancela reservas impagadas cuyo hold expiró. */
export async function expireStaleHoldReservations(db: DbClient = prisma): Promise<number> {
  const now = new Date();
  const result = await db.reservation.updateMany({
    where: {
      paymentStatus: PaymentStatus.PENDING,
      status: { notIn: [ReservationStatus.CANCELLED, ReservationStatus.CHECKED_IN, ReservationStatus.CHECKED_OUT] },
      expiresAt: { lt: now },
    },
    data: {
      status: ReservationStatus.CANCELLED,
      paymentStatus: PaymentStatus.CANCELLED,
    },
  });
  return result.count;
}

export function isReservationHoldExpired(reservation: {
  paymentStatus: PaymentStatus;
  status: ReservationStatus;
  expiresAt: Date | null;
}): boolean {
  if (reservation.status === ReservationStatus.CANCELLED) return true;
  if (reservation.paymentStatus === PaymentStatus.PAID) return false;
  if (reservation.paymentStatus !== PaymentStatus.PENDING) return false;
  if (!reservation.expiresAt) return false;
  return reservation.expiresAt <= new Date();
}

export function assertReservationPayable(reservation: {
  paymentStatus: PaymentStatus;
  status: ReservationStatus;
  expiresAt: Date | null;
}): void {
  if (reservation.status === ReservationStatus.CANCELLED) {
    throw new Error("Esta reserva fue cancelada.");
  }
  if (isReservationHoldExpired(reservation)) {
    throw new Error("El tiempo para completar el pago expiró. Vuelve a buscar disponibilidad.");
  }
  if (reservation.paymentStatus === PaymentStatus.REFUNDED) {
    throw new Error("Esta reserva fue reembolsada.");
  }
}

export function isSimulatedPaymentAllowed(): boolean {
  const forced = process.env.ALLOW_SIMULATED_PAYMENT?.trim().toLowerCase();
  if (forced === "true") return true;
  if (forced === "false") return false;
  return process.env.NODE_ENV !== "production";
}

/** Pago online (Mercado Pago / tarjeta). Activar cuando esté listo en producción. */
export function isOnlinePaymentEnabled(): boolean {
  return process.env.ONLINE_PAYMENT_ENABLED?.trim().toLowerCase() === "true";
}

/** Hold activo del mismo huésped para habitación y fechas (reanudar checkout abandonado). */
export async function findActiveGuestHold(
  db: DbClient,
  params: {
    roomId: string;
    checkIn: Date;
    checkOut: Date;
    guestEmail: string;
  }
) {
  const now = new Date();
  return db.reservation.findFirst({
    where: {
      roomId: params.roomId,
      checkIn: params.checkIn,
      checkOut: params.checkOut,
      paymentStatus: PaymentStatus.PENDING,
      status: {
        notIn: [
          ReservationStatus.CANCELLED,
          ReservationStatus.CHECKED_IN,
          ReservationStatus.CHECKED_OUT,
        ],
      },
      guest: { email: params.guestEmail },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    include: { room: true, guest: true },
  });
}
