import { PaymentStatus, ReservationStatus } from "@prisma/client";
import { AppError } from "@/lib/api-response";

export type DiscountableReservation = {
  totalAmount: unknown;
  listTotalAmount?: unknown | null;
  paymentStatus: PaymentStatus;
  status: ReservationStatus;
  paymentProvider?: string | null;
};

export function getListTotalAmount(reservation: {
  totalAmount: unknown;
  listTotalAmount?: unknown | null;
}): number {
  const list = reservation.listTotalAmount;
  if (list != null && list !== "") {
    return Number(list);
  }
  return Number(reservation.totalAmount);
}

export function hasActiveDiscount(reservation: {
  totalAmount: unknown;
  listTotalAmount?: unknown | null;
}): boolean {
  const list = getListTotalAmount(reservation);
  const charged = Number(reservation.totalAmount);
  return Number.isFinite(list) && Number.isFinite(charged) && charged < list - 0.009;
}

/** ¿Se puede ajustar el monto cobrado? */
export function assertCanAdjustReservationAmount(reservation: DiscountableReservation): void {
  if (
    reservation.status === ReservationStatus.CANCELLED ||
    reservation.paymentStatus === PaymentStatus.CANCELLED ||
    reservation.paymentStatus === PaymentStatus.REFUNDED
  ) {
    throw new AppError("No se puede aplicar descuento a una reserva cancelada o reembolsada.", 400);
  }

  if (
    reservation.paymentStatus === PaymentStatus.PAID &&
    reservation.paymentProvider === "MERCADO_PAGO"
  ) {
    throw new AppError(
      "Esta reserva ya se cobró por Mercado Pago. El descuento debe gestionarse como reembolso parcial fuera de este ajuste.",
      400
    );
  }
}

export type ApplyDiscountInput = {
  chargedAmount: number;
  reason?: string | null;
  clearDiscount?: boolean;
  appliedBy: string;
};

export type DiscountUpdateData = {
  listTotalAmount: number;
  totalAmount: number;
  discountReason: string | null;
  discountAppliedAt: Date | null;
  discountAppliedBy: string | null;
};

/**
 * Calcula el update de descuento.
 * Sin descuento: totalAmount = listTotalAmount y campos de descuento en null.
 */
export function buildDiscountUpdate(
  reservation: DiscountableReservation,
  input: ApplyDiscountInput
): DiscountUpdateData {
  assertCanAdjustReservationAmount(reservation);

  const listTotal = getListTotalAmount(reservation);

  if (input.clearDiscount) {
    return {
      listTotalAmount: listTotal,
      totalAmount: listTotal,
      discountReason: null,
      discountAppliedAt: null,
      discountAppliedBy: null,
    };
  }

  const charged = Number(input.chargedAmount);
  if (!Number.isFinite(charged) || charged <= 0) {
    throw new AppError("El monto cobrado debe ser mayor a 0.", 400);
  }
  if (charged > listTotal + 0.009) {
    throw new AppError(
      `El monto cobrado no puede superar el precio de lista (${listTotal}).`,
      400
    );
  }

  // Igual al listado = quitar descuento
  if (Math.abs(charged - listTotal) <= 0.009) {
    return {
      listTotalAmount: listTotal,
      totalAmount: listTotal,
      discountReason: null,
      discountAppliedAt: null,
      discountAppliedBy: null,
    };
  }

  const reason = input.reason?.trim() ?? "";
  if (reason.length < 3) {
    throw new AppError("Indicá un motivo del descuento (mínimo 3 caracteres).", 400);
  }
  if (reason.length > 200) {
    throw new AppError("El motivo del descuento es demasiado largo.", 400);
  }

  return {
    listTotalAmount: listTotal,
    totalAmount: Math.round(charged * 100) / 100,
    discountReason: reason,
    discountAppliedAt: new Date(),
    discountAppliedBy: input.appliedBy.trim() || "staff",
  };
}

export function serializeReservationMoney(reservation: {
  pricePerNight: unknown;
  totalAmount: unknown;
  listTotalAmount?: unknown | null;
  discountReason?: string | null;
  discountAppliedAt?: Date | string | null;
  discountAppliedBy?: string | null;
}) {
  const listTotalAmount = getListTotalAmount(reservation);
  const totalAmount = Number(reservation.totalAmount);
  const discounted = hasActiveDiscount({ totalAmount, listTotalAmount });
  return {
    pricePerNight: Number(reservation.pricePerNight),
    listTotalAmount,
    totalAmount,
    discountAmount: discounted ? Math.round((listTotalAmount - totalAmount) * 100) / 100 : 0,
    discountReason: discounted ? reservation.discountReason ?? null : null,
    discountAppliedAt: discounted
      ? reservation.discountAppliedAt
        ? new Date(reservation.discountAppliedAt).toISOString()
        : null
      : null,
    discountAppliedBy: discounted ? reservation.discountAppliedBy ?? null : null,
    hasDiscount: discounted,
  };
}
