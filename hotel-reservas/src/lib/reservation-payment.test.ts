import { PaymentStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  buildPaymentFieldsUpdate,
  computeDefaultDepositAmount,
  getBalanceDue,
} from "./reservation-payment";

describe("reservation-payment", () => {
  it("calcula abono 50%", () => {
    expect(computeDefaultDepositAmount(100000)).toBe(50000);
    expect(computeDefaultDepositAmount(99999)).toBe(49999.5);
  });

  it("registerDeposit marca PARTIAL y limpia expiresAt", () => {
    const update = buildPaymentFieldsUpdate(
      { totalAmount: 200000, amountPaid: 0, paymentStatus: PaymentStatus.PENDING },
      { registerDeposit: true }
    );
    expect(update).toEqual({
      paymentStatus: PaymentStatus.PARTIAL,
      amountPaid: 100000,
      expiresAt: null,
    });
  });

  it("PAID completa amountPaid al total", () => {
    const update = buildPaymentFieldsUpdate(
      { totalAmount: 200000, amountPaid: 100000, paymentStatus: PaymentStatus.PARTIAL },
      { paymentStatus: PaymentStatus.PAID }
    );
    expect(update.paymentStatus).toBe(PaymentStatus.PAID);
    expect(update.amountPaid).toBe(200000);
    expect(update.expiresAt).toBeNull();
  });

  it("getBalanceDue resta abono", () => {
    expect(getBalanceDue({ totalAmount: 200000, amountPaid: 100000 })).toBe(100000);
  });
});
