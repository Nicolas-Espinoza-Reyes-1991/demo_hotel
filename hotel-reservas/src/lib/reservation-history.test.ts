import { PaymentStatus, ReservationStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  isHistoricalReservation,
  paymentStatusLabel,
  reservationScopeWhere,
} from "./reservation-history";

describe("reservation-history", () => {
  it("detecta reservas canceladas o reembolsadas", () => {
    expect(
      isHistoricalReservation({
        paymentStatus: PaymentStatus.CANCELLED,
        status: ReservationStatus.CONFIRMED,
      })
    ).toBe(true);
    expect(
      isHistoricalReservation({
        paymentStatus: PaymentStatus.REFUNDED,
        status: ReservationStatus.CANCELLED,
      })
    ).toBe(true);
    expect(
      isHistoricalReservation({
        paymentStatus: PaymentStatus.PAID,
        status: ReservationStatus.CANCELLED,
      })
    ).toBe(true);
    expect(
      isHistoricalReservation({
        paymentStatus: PaymentStatus.PAID,
        status: ReservationStatus.CONFIRMED,
      })
    ).toBe(false);
  });

  it("filtra por scope active e history", () => {
    expect(reservationScopeWhere("active")).toMatchObject({
      paymentStatus: { notIn: [PaymentStatus.CANCELLED, PaymentStatus.REFUNDED] },
    });
    expect(reservationScopeWhere("history").OR).toHaveLength(2);
    expect(reservationScopeWhere("all")).toEqual({});
  });

  it("traduce estados de pago", () => {
    expect(paymentStatusLabel(PaymentStatus.PAID)).toBe("Pagado");
    expect(paymentStatusLabel(PaymentStatus.PARTIAL)).toBe("Abonado");
    expect(paymentStatusLabel(PaymentStatus.PENDING)).toBe("Pendiente");
    expect(paymentStatusLabel(PaymentStatus.REFUNDED)).toBe("Reembolsado");
    expect(paymentStatusLabel(PaymentStatus.CANCELLED)).toBe("Cancelado");
  });
});
