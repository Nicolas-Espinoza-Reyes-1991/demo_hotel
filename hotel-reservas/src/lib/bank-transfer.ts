import { PaymentStatus } from "@prisma/client";
import type { BankTransferConfig } from "@/types/payments";
import { checkRoomAvailability } from "./availability";
import {
  buildReservationEmailPayload,
  sendBankTransferInstructionsEmail,
} from "./email";
import prisma from "./prisma";
import type { PaymentResult } from "./payment";
import { assertReservationPayable, computeBankTransferExpiresAt } from "./reservation-holds";

export type { BankTransferConfig };

export function getBankTransferConfig(): BankTransferConfig | null {
  const bankName = process.env.BANK_NAME?.trim();
  const accountHolder = process.env.BANK_ACCOUNT_HOLDER?.trim();
  const accountNumber = process.env.BANK_ACCOUNT_NUMBER?.trim();

  const explicitlyDisabled = process.env.BANK_TRANSFER_ENABLED?.trim().toLowerCase() === "false";
  if (explicitlyDisabled || !bankName || !accountHolder || !accountNumber) {
    return null;
  }

  const deadlineHours = Number(process.env.BANK_TRANSFER_DEADLINE_HOURS ?? "48");

  return {
    enabled: true,
    bankName,
    accountHolder,
    accountNumber,
    accountType: process.env.BANK_ACCOUNT_TYPE?.trim() || "Cuenta corriente",
    taxId: process.env.BANK_TAX_ID?.trim() || undefined,
    cbu: process.env.BANK_CBU?.trim() || undefined,
    alias: process.env.BANK_ALIAS?.trim() || undefined,
    swift: process.env.BANK_SWIFT?.trim() || undefined,
    contactEmail: process.env.BANK_CONTACT_EMAIL?.trim() || undefined,
    deadlineHours: Number.isFinite(deadlineHours) && deadlineHours > 0 ? deadlineHours : 48,
    notes: process.env.BANK_TRANSFER_NOTES?.trim() || undefined,
  };
}

export function isBankTransferEnabled(): boolean {
  return getBankTransferConfig()?.enabled ?? false;
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
        "La habitación ya no está disponible para registrar la transferencia."
    );
  }
}

export async function processBankTransferPayment(reservationId: string): Promise<PaymentResult> {
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
      transactionId: reservation.confirmationCode,
      paymentStatus: PaymentStatus.PAID,
      message: "El pago ya fue registrado.",
      provider: "BANK_TRANSFER",
    };
  }

  await assertReservationStillAvailable(reservation);

  if (!isBankTransferEnabled()) {
    throw new Error("La transferencia bancaria no está disponible.");
  }

  const config = getBankTransferConfig();
  if (!config) {
    throw new Error("La transferencia bancaria no está disponible.");
  }

  await prisma.reservation.update({
    where: { id: reservationId },
    data: {
      paymentProvider: "BANK_TRANSFER",
      paymentStatus: PaymentStatus.PENDING,
      expiresAt: computeBankTransferExpiresAt(config.deadlineHours),
    },
  });

  void sendBankTransferInstructionsEmail(
    buildReservationEmailPayload(reservation),
    config
  );

  return {
    success: true,
    transactionId: reservation.confirmationCode,
    paymentStatus: PaymentStatus.PENDING,
    message:
      "Reserva registrada. Realiza la transferencia con el código de referencia para confirmar tu estadía.",
    provider: "BANK_TRANSFER",
  };
}
