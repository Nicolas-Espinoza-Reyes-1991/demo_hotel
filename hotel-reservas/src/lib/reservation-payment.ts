import { PaymentStatus } from "@prisma/client";
import { AppError } from "@/lib/api-response";

/** Porcentaje de abono por defecto (50%). */
export const DEFAULT_DEPOSIT_RATIO = 0.5;

export function toMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function computeDefaultDepositAmount(totalAmount: number): number {
  const total = Number(totalAmount);
  if (!Number.isFinite(total) || total <= 0) return 0;
  return toMoney(total * DEFAULT_DEPOSIT_RATIO);
}

export function getAmountPaid(reservation: { amountPaid?: unknown | null }): number {
  const value = Number(reservation.amountPaid ?? 0);
  return Number.isFinite(value) && value > 0 ? toMoney(value) : 0;
}

export function getBalanceDue(reservation: {
  totalAmount: unknown;
  amountPaid?: unknown | null;
}): number {
  const total = Number(reservation.totalAmount);
  const paid = getAmountPaid(reservation);
  if (!Number.isFinite(total)) return 0;
  return toMoney(Math.max(0, total - paid));
}

export function paymentStatusLabelEs(status: PaymentStatus | string): string {
  if (status === PaymentStatus.PAID || status === "PAID") return "Pagado";
  if (status === PaymentStatus.PARTIAL || status === "PARTIAL") return "Abonado";
  if (status === PaymentStatus.PENDING || status === "PENDING") return "Pendiente";
  if (status === PaymentStatus.REFUNDED || status === "REFUNDED") return "Reembolsado";
  if (status === PaymentStatus.CANCELLED || status === "CANCELLED") return "Cancelado";
  return String(status);
}

type PaymentUpdateInput = {
  paymentStatus?: PaymentStatus | string;
  amountPaid?: number;
  registerDeposit?: boolean;
};

/**
 * Calcula paymentStatus / amountPaid / expiresAt al actualizar desde admin.
 * - registerDeposit → PARTIAL al 50% del total, sin vencimiento.
 * - PAID → amountPaid = total (o el enviado).
 * - PARTIAL → amountPaid = enviado o 50% del total.
 * - PENDING → amountPaid = 0.
 */
export function buildPaymentFieldsUpdate(
  reservation: {
    totalAmount: unknown;
    amountPaid?: unknown | null;
    paymentStatus: PaymentStatus | string;
  },
  input: PaymentUpdateInput
): {
  paymentStatus?: PaymentStatus;
  amountPaid?: number;
  expiresAt?: Date | null;
} {
  const total = toMoney(Number(reservation.totalAmount));
  if (!Number.isFinite(total) || total <= 0) {
    throw new AppError("El total de la reserva no es válido.", 400);
  }

  if (input.registerDeposit) {
    if (
      reservation.paymentStatus === PaymentStatus.PAID ||
      reservation.paymentStatus === PaymentStatus.CANCELLED ||
      reservation.paymentStatus === PaymentStatus.REFUNDED
    ) {
      throw new AppError("No se puede registrar un abono en esta reserva.", 400);
    }
    const deposit =
      input.amountPaid != null && Number.isFinite(input.amountPaid) && input.amountPaid > 0
        ? toMoney(input.amountPaid)
        : computeDefaultDepositAmount(total);
    if (deposit <= 0 || deposit >= total - 0.009) {
      throw new AppError(
        "El abono debe ser mayor a 0 y menor al total. Para el total usá estado Pagado.",
        400
      );
    }
    return {
      paymentStatus: PaymentStatus.PARTIAL,
      amountPaid: deposit,
      expiresAt: null,
    };
  }

  if (!input.paymentStatus) {
    if (input.amountPaid != null) {
      const paid = toMoney(input.amountPaid);
      if (paid < 0 || paid > total + 0.009) {
        throw new AppError("El monto abonado debe estar entre 0 y el total.", 400);
      }
      if (paid <= 0.009) {
        return { amountPaid: 0, paymentStatus: PaymentStatus.PENDING };
      }
      if (paid >= total - 0.009) {
        return { amountPaid: total, paymentStatus: PaymentStatus.PAID, expiresAt: null };
      }
      return { amountPaid: paid, paymentStatus: PaymentStatus.PARTIAL, expiresAt: null };
    }
    return {};
  }

  const status = input.paymentStatus as PaymentStatus;

  if (status === PaymentStatus.PAID) {
    const paid =
      input.amountPaid != null && Number.isFinite(input.amountPaid)
        ? toMoney(input.amountPaid)
        : total;
    return {
      paymentStatus: PaymentStatus.PAID,
      amountPaid: Math.max(paid, total),
      expiresAt: null,
    };
  }

  if (status === PaymentStatus.PARTIAL) {
    const paid =
      input.amountPaid != null && Number.isFinite(input.amountPaid) && input.amountPaid > 0
        ? toMoney(input.amountPaid)
        : computeDefaultDepositAmount(total);
    if (paid <= 0 || paid >= total - 0.009) {
      throw new AppError(
        "Para Abonado el monto debe ser parcial. Usá Pagado si cobraste el total.",
        400
      );
    }
    return {
      paymentStatus: PaymentStatus.PARTIAL,
      amountPaid: paid,
      expiresAt: null,
    };
  }

  if (status === PaymentStatus.PENDING) {
    return {
      paymentStatus: PaymentStatus.PENDING,
      amountPaid: 0,
    };
  }

  if (status === PaymentStatus.CANCELLED || status === PaymentStatus.REFUNDED) {
    return {
      paymentStatus: status,
      ...(input.amountPaid != null ? { amountPaid: toMoney(input.amountPaid) } : {}),
    };
  }

  return { paymentStatus: status };
}
