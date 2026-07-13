import MercadoPagoConfig, { Payment } from "mercadopago";
import { PaymentStatus, ReservationStatus } from "@prisma/client";
import { checkRoomAvailability } from "./availability";
import { sendReservationPaidEmail, buildReservationEmailPayload } from "./email";
import prisma from "./prisma";
import type { PaymentResult } from "./payment";
import { assertReservationPayable } from "./reservation-holds";

export type MercadoPagoFormData = {
  token: string;
  payment_method_id: string;
  transaction_amount: number;
  installments: number;
  issuer_id?: string | number;
  payer: {
    email: string;
    identification?: {
      type: string;
      number: string;
    };
  };
};

export function isMercadoPagoConfigured(): boolean {
  return Boolean(
    process.env.MERCADOPAGO_ACCESS_TOKEN?.trim() &&
      process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY?.trim()
  );
}

export function getMercadoPagoPublicKey(): string | null {
  return process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY?.trim() ?? null;
}

export function getMercadoPagoCurrency(): string {
  return process.env.MERCADOPAGO_CURRENCY?.trim() || "USD";
}

export function getAppUrl(): string {
  return process.env.APP_URL?.trim() || "http://localhost:3000";
}

function getMercadoPagoClient() {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  if (!accessToken) {
    throw new Error("Mercado Pago no está configurado.");
  }
  return new MercadoPagoConfig({ accessToken });
}

function mapMercadoPagoStatus(status?: string): PaymentStatus {
  if (status === "approved") return PaymentStatus.PAID;
  if (status === "refunded") return PaymentStatus.REFUNDED;
  if (status === "cancelled") return PaymentStatus.CANCELLED;
  return PaymentStatus.PENDING;
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

export async function createMercadoPagoPayment(
  reservationId: string,
  formData: MercadoPagoFormData
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
      transactionId: reservation.mercadoPagoPaymentId ?? reservation.confirmationCode,
      paymentStatus: PaymentStatus.PAID,
      message: "El pago ya fue registrado.",
      provider: "MERCADO_PAGO",
    };
  }

  await assertReservationStillAvailable(reservation);

  const expectedAmount = Number(reservation.totalAmount);
  if (Math.abs(formData.transaction_amount - expectedAmount) > 0.01) {
    throw new Error("El monto del pago no coincide con la reserva.");
  }

  const client = getMercadoPagoClient();
  const paymentClient = new Payment(client);

  const mpPayment = await paymentClient.create({
    body: {
      transaction_amount: expectedAmount,
      token: formData.token,
      description: `Reserva ${reservation.confirmationCode} · ${reservation.room.name}`,
      installments: formData.installments,
      payment_method_id: formData.payment_method_id,
      issuer_id: formData.issuer_id ? Number(formData.issuer_id) : undefined,
      payer: {
        email: formData.payer.email,
        identification: formData.payer.identification,
      },
      external_reference: reservationId,
      notification_url: `${getAppUrl()}/api/webhooks/mercadopago`,
      metadata: {
        reservation_id: reservationId,
        confirmation_code: reservation.confirmationCode,
      },
    },
    requestOptions: {
      idempotencyKey: `mp-${reservationId}`,
    },
  });

  const paymentStatus = mapMercadoPagoStatus(mpPayment.status);
  const mpPaymentId = mpPayment.id ? String(mpPayment.id) : undefined;
  const shouldNotifyPaid = paymentStatus === PaymentStatus.PAID;

  if (paymentStatus === PaymentStatus.PAID) {
    await assertReservationStillAvailable(reservation);
  }

  await prisma.reservation.update({
    where: { id: reservationId },
    data: {
      paymentStatus,
      paymentProvider: "MERCADO_PAGO",
      mercadoPagoPaymentId: mpPaymentId,
      ...(paymentStatus === PaymentStatus.PAID
        ? {
            status: ReservationStatus.CONFIRMED,
            expiresAt: null,
            amountPaid: reservation.totalAmount,
          }
        : {}),
    },
  });

  if (shouldNotifyPaid) {
    void sendReservationPaidEmail(buildReservationEmailPayload(reservation));
  }

  if (paymentStatus === PaymentStatus.PAID) {
    return {
      success: true,
      transactionId: mpPaymentId ?? reservation.confirmationCode,
      paymentStatus,
      message: "Pago aprobado con Mercado Pago.",
      provider: "MERCADO_PAGO",
    };
  }

  if (mpPayment.status === "rejected") {
    const reason =
      mpPayment.status_detail ??
      mpPayment.transaction_details?.net_received_amount ??
      "Pago rechazado.";
    throw new Error(`Mercado Pago rechazó el pago: ${reason}`);
  }

  return {
    success: true,
    transactionId: mpPaymentId ?? reservation.confirmationCode,
    paymentStatus,
    message: "Pago registrado. Mercado Pago está procesando la transacción.",
    provider: "MERCADO_PAGO",
  };
}

export async function syncMercadoPagoPayment(mpPaymentId: string): Promise<void> {
  const client = getMercadoPagoClient();
  const paymentClient = new Payment(client);
  const mpPayment = await paymentClient.get({ id: mpPaymentId });

  const reservationId = mpPayment.external_reference;
  if (!reservationId) return;

  const paymentStatus = mapMercadoPagoStatus(mpPayment.status);

  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { room: true, guest: true },
  });

  if (!reservation) return;

  const mpPaymentIdString = String(mpPayment.id);

  if (paymentStatus === PaymentStatus.PAID) {
    try {
      assertReservationPayable(reservation);
      await assertReservationStillAvailable(reservation);
    } catch (error) {
      console.warn("[Mercado Pago Webhook] Pago aprobado para reserva no confirmable", {
        reservationId,
        mpPaymentId: mpPaymentIdString,
        reason: error instanceof Error ? error.message : "unknown",
      });

      await prisma.reservation.updateMany({
        where: { id: reservationId },
        data: {
          paymentProvider: "MERCADO_PAGO",
          mercadoPagoPaymentId: mpPaymentIdString,
        },
      });
      return;
    }
  }

  const shouldNotifyPaid =
    paymentStatus === PaymentStatus.PAID && reservation.paymentStatus !== PaymentStatus.PAID;

  await prisma.reservation.updateMany({
    where: { id: reservationId },
    data: {
      paymentStatus,
      paymentProvider: "MERCADO_PAGO",
      mercadoPagoPaymentId: mpPaymentIdString,
      ...(paymentStatus === PaymentStatus.PAID
        ? {
            status: ReservationStatus.CONFIRMED,
            expiresAt: null,
            amountPaid: reservation.totalAmount,
          }
        : {}),
    },
  });

  if (shouldNotifyPaid) {
    void sendReservationPaidEmail(buildReservationEmailPayload(reservation));
  }
}
