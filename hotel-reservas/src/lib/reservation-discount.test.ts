import { describe, expect, it } from "vitest";
import { PaymentStatus, ReservationStatus } from "@prisma/client";
import { AppError } from "@/lib/api-response";
import {
  buildDiscountUpdate,
  getListTotalAmount,
  hasActiveDiscount,
  serializeReservationMoney,
} from "@/lib/reservation-discount";

const base = {
  totalAmount: 65000,
  listTotalAmount: 65000,
  paymentStatus: PaymentStatus.PENDING,
  status: ReservationStatus.CONFIRMED,
  paymentProvider: "BANK_TRANSFER" as string | null,
};

describe("reservation-discount", () => {
  it("sin descuento: list = total", () => {
    expect(hasActiveDiscount(base)).toBe(false);
    expect(getListTotalAmount({ totalAmount: 50, listTotalAmount: null })).toBe(50);
  });

  it("aplica descuento con motivo", () => {
    const update = buildDiscountUpdate(base, {
      chargedAmount: 55000,
      reason: "Cliente frecuente",
      appliedBy: "nelson",
    });
    expect(update.totalAmount).toBe(55000);
    expect(update.listTotalAmount).toBe(65000);
    expect(update.discountReason).toBe("Cliente frecuente");
    expect(update.discountAppliedBy).toBe("nelson");
    expect(update.discountAppliedAt).toBeInstanceOf(Date);
  });

  it("exige motivo si baja el monto", () => {
    expect(() =>
      buildDiscountUpdate(base, { chargedAmount: 55000, reason: "ab", appliedBy: "nelson" })
    ).toThrow(AppError);
  });

  it("no permite superar el precio de lista", () => {
    expect(() =>
      buildDiscountUpdate(base, {
        chargedAmount: 70000,
        reason: "error",
        appliedBy: "nelson",
      })
    ).toThrow(/precio de lista/);
  });

  it("bloquea Mercado Pago ya pagado", () => {
    expect(() =>
      buildDiscountUpdate(
        {
          ...base,
          paymentStatus: PaymentStatus.PAID,
          paymentProvider: "MERCADO_PAGO",
        },
        { chargedAmount: 55000, reason: "promo", appliedBy: "nelson" }
      )
    ).toThrow(/Mercado Pago/);
  });

  it("clearDiscount restaura lista", () => {
    const update = buildDiscountUpdate(
      { ...base, totalAmount: 55000, listTotalAmount: 65000 },
      { chargedAmount: 55000, clearDiscount: true, appliedBy: "nelson" }
    );
    expect(update.totalAmount).toBe(65000);
    expect(update.discountReason).toBeNull();
  });

  it("serialize expone hasDiscount", () => {
    const money = serializeReservationMoney({
      pricePerNight: 32500,
      totalAmount: 55000,
      listTotalAmount: 65000,
      discountReason: "Promo",
      discountAppliedAt: new Date("2026-07-10T12:00:00.000Z"),
      discountAppliedBy: "nelson",
    });
    expect(money.hasDiscount).toBe(true);
    expect(money.discountAmount).toBe(10000);
    expect(money.totalAmount).toBe(55000);
  });
});
