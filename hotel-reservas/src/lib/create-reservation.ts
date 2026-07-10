import { PaymentStatus, Prisma, ReservationStatus } from "@prisma/client";
import { checkRoomAvailability } from "./availability";
import { generateUniqueConfirmationCode } from "./confirmation-code";
import type { CheckoutPayload } from "./checkout-token";
import { toDateOnly } from "./dates";
import { computeHoldExpiresAt } from "./reservation-holds";

type DbClient = Prisma.TransactionClient;

export async function createReservationFromCheckout(tx: DbClient, payload: CheckoutPayload) {
  const checkInDate = toDateOnly(payload.checkIn);
  const checkOutDate = toDateOnly(payload.checkOut);
  const birthDate = toDateOnly(payload.guest.birthDate);
  const guest = payload.guest;

  const room = await tx.room.findUnique({ where: { id: payload.roomId } });
  if (!room) {
    throw new Error("Habitación no encontrada.");
  }

  if (payload.guestsCount > room.maxGuests) {
    throw new Error(`Esta habitación admite máximo ${room.maxGuests} huéspedes.`);
  }

  const availability = await checkRoomAvailability(
    payload.roomId,
    checkInDate,
    checkOutDate,
    undefined,
    tx
  );

  if (!availability.available) {
    const conflict = availability.conflicts[0];
    throw new Error(conflict?.message ?? "Habitación no disponible para esas fechas.");
  }

  const guestRecord = await tx.guest.upsert({
    where: { email: guest.email },
    create: {
      fullName: guest.fullName,
      email: guest.email,
      phone: guest.phone,
      documentType: guest.documentType,
      rut: guest.documentType === "RUT" ? guest.rut : null,
      passport: guest.documentType === "PASSPORT" ? guest.passport : null,
      birthDate,
    },
    update: {
      fullName: guest.fullName.trim(),
      phone: guest.phone,
      documentType: guest.documentType,
      birthDate,
      ...(guest.documentType === "RUT"
        ? { rut: guest.rut ?? null, passport: null }
        : { passport: guest.passport ?? null, rut: null }),
    },
  });

  const confirmationCode = await generateUniqueConfirmationCode(tx, payload.checkIn);

  return tx.reservation.create({
    data: {
      confirmationCode,
      roomId: payload.roomId,
      guestId: guestRecord.id,
      guestFullName: guest.fullName.trim(),
      guestDocumentType: guest.documentType,
      guestRut: guest.documentType === "RUT" ? guest.rut ?? null : null,
      guestPassport: guest.documentType === "PASSPORT" ? guest.passport ?? null : null,
      guestBirthDate: birthDate,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      nights: availability.nights,
      guestsCount: payload.guestsCount,
      pricePerNight: room.pricePerNight,
      listTotalAmount: availability.totalAmount,
      totalAmount: availability.totalAmount,
      paymentStatus: PaymentStatus.PENDING,
      status: ReservationStatus.CONFIRMED,
      specialRequests: payload.specialRequests,
      expiresAt: computeHoldExpiresAt(),
    },
    include: {
      room: true,
      guest: true,
    },
  });
}
