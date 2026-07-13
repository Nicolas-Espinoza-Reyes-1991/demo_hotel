import { PaymentStatus, Prisma, ReservationStatus } from "@prisma/client";

export type ReservationScope = "active" | "history" | "all";

export function isHistoricalReservation(reservation: {
  paymentStatus: PaymentStatus | string;
  status: ReservationStatus | string;
}): boolean {
  return (
    reservation.paymentStatus === PaymentStatus.CANCELLED ||
    reservation.paymentStatus === PaymentStatus.REFUNDED ||
    reservation.status === ReservationStatus.CANCELLED
  );
}

export const historicalReservationWhere: Prisma.ReservationWhereInput = {
  OR: [
    { paymentStatus: { in: [PaymentStatus.CANCELLED, PaymentStatus.REFUNDED] } },
    { status: ReservationStatus.CANCELLED },
  ],
};

export const activeReservationWhere: Prisma.ReservationWhereInput = {
  paymentStatus: { notIn: [PaymentStatus.CANCELLED, PaymentStatus.REFUNDED] },
  status: { not: ReservationStatus.CANCELLED },
};

export function reservationScopeWhere(scope: ReservationScope): Prisma.ReservationWhereInput {
  if (scope === "history") return historicalReservationWhere;
  if (scope === "active") return activeReservationWhere;
  return {};
}

export function paymentStatusLabel(status: PaymentStatus | string): string {
  if (status === PaymentStatus.PAID) return "Pagado";
  if (status === PaymentStatus.PARTIAL) return "Abonado";
  if (status === PaymentStatus.PENDING) return "Pendiente";
  if (status === PaymentStatus.REFUNDED) return "Reembolsado";
  if (status === PaymentStatus.CANCELLED) return "Cancelado";
  return String(status);
}
