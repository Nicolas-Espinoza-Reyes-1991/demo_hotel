import {
  PaymentStatus,
  Prisma,
  ReservationStatus,
  Room,
  RoomStatus,
} from "@prisma/client";
import {
  calculateNights,
  formatDateOnlyUTC,
  getMonthRangeUTC,
  parseDateOnly,
  toDateOnly,
} from "./dates";
import { historicalReservationWhere } from "./reservation-history";
import { expireStaleHoldReservations } from "./reservation-holds";
import { calculateStayPricing } from "./room-pricing";
import prisma from "./prisma";

type DbClient = Prisma.TransactionClient | typeof prisma;

/** Estados de reserva que ocupan inventario (bloquean fechas). */
export const OCCUPYING_RESERVATION_STATUSES: ReservationStatus[] = [
  ReservationStatus.CONFIRMED,
  ReservationStatus.CHECKED_IN,
  ReservationStatus.CHECKED_OUT,
];

export type AvailabilityConflict = {
  type: "RESERVATION" | "ROOM_STATUS" | "ROOM_BLOCK";
  message: string;
  reservationId?: string;
};

export type AvailabilityResult = {
  available: boolean;
  conflicts: AvailabilityConflict[];
  nights: number;
  totalAmount: number;
  /** Precio promedio por noche de la estadía (para snapshot en la reserva). */
  averagePricePerNight: number;
};

export function formatDateRangeLabel(checkIn: Date, checkOut: Date): string {
  const start = parseDateOnly(formatDateOnlyUTC(checkIn));
  const end = parseDateOnly(formatDateOnlyUTC(checkOut));
  const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
  return `${start.toLocaleDateString("es-AR", options)} al ${end.toLocaleDateString("es-AR", options)}`;
}

function reservationConflictPaymentLabel(status: PaymentStatus): string {
  if (status === PaymentStatus.PAID) return "confirmada y pagada";
  if (status === PaymentStatus.PARTIAL) return "confirmada con abono";
  if (status === PaymentStatus.PENDING) return "pendiente de pago";
  return "activa";
}

export function formatReservationConflictMessage(
  reservation: {
    guestFullName: string;
    checkIn: Date;
    checkOut: Date;
    paymentStatus: PaymentStatus;
  },
  room: { code: string; name: string }
): string {
  const dates = formatDateRangeLabel(reservation.checkIn, reservation.checkOut);
  const payment = reservationConflictPaymentLabel(reservation.paymentStatus);
  return (
    `No se puede crear el bloqueo: la habitación ${room.code} (${room.name}) tiene una reserva ${payment} ` +
    `de ${reservation.guestFullName} del ${dates}. Revisá el calendario o gestioná esa reserva antes de bloquear.`
  );
}

export function formatRoomBlockConflictMessage(
  block: { startDate: Date; endDate: Date; reason: string | null },
  room: { code: string; name: string }
): string {
  const dates = formatDateRangeLabel(block.startDate, block.endDate);
  const reason = block.reason?.trim();
  return (
    `No se puede crear el bloqueo: la habitación ${room.code} (${room.name}) ya tiene un bloqueo del ${dates}` +
    `${reason ? ` (${reason})` : ""}.`
  );
}

/**
 * Regla de solapamiento de rangos [checkIn, checkOut):
 * Dos rangos se cruzan si: newCheckIn < existingCheckOut AND newCheckOut > existingCheckIn
 */
export function dateRangesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date
): boolean {
  return aStart < bEnd && aEnd > bStart;
}

/**
 * Verifica disponibilidad de una habitación en un rango de fechas.
 * Ejecutar SIEMPRE dentro de una transacción al crear reservas (control de concurrencia).
 */
export async function checkRoomAvailability(
  roomId: string,
  checkIn: Date | string,
  checkOut: Date | string,
  excludeReservationId?: string,
  db: DbClient = prisma
): Promise<AvailabilityResult> {
  const start = toDateOnly(checkIn);
  const end = toDateOnly(checkOut);
  const nights = calculateNights(start, end);
  const conflicts: AvailabilityConflict[] = [];

  if (nights <= 0) {
    return {
      available: false,
      conflicts: [{ type: "RESERVATION", message: "La fecha de salida debe ser posterior al check-in." }],
      nights: 0,
      totalAmount: 0,
      averagePricePerNight: 0,
    };
  }

  const room = await db.room.findUnique({ where: { id: roomId } });
  if (!room) {
    return {
      available: false,
      conflicts: [{ type: "ROOM_STATUS", message: "Habitación no encontrada." }],
      nights,
      totalAmount: 0,
      averagePricePerNight: 0,
    };
  }

  if (room.status === RoomStatus.MAINTENANCE) {
    conflicts.push({
      type: "ROOM_STATUS",
      message: "La habitación está en mantenimiento.",
    });
  }

  if (room.status === RoomStatus.BLOCKED) {
    conflicts.push({
      type: "ROOM_STATUS",
      message: "La habitación está bloqueada.",
    });
  }

  const overlappingReservations = await db.reservation.findMany({
    where: {
      roomId,
      status: { in: OCCUPYING_RESERVATION_STATUSES },
      ...(excludeReservationId ? { id: { not: excludeReservationId } } : {}),
      checkIn: { lt: end },
      checkOut: { gt: start },
      OR: [
        { paymentStatus: PaymentStatus.PAID },
        { paymentStatus: PaymentStatus.PARTIAL },
        { paymentStatus: PaymentStatus.PENDING, expiresAt: null },
        { paymentStatus: PaymentStatus.PENDING, expiresAt: { gt: new Date() } },
      ],
    },
    select: {
      id: true,
      checkIn: true,
      checkOut: true,
      guestFullName: true,
      paymentStatus: true,
    },
  });

  for (const reservation of overlappingReservations) {
    conflicts.push({
      type: "RESERVATION",
      message: formatReservationConflictMessage(reservation, room),
      reservationId: reservation.id,
    });
  }

  const overlappingBlocks = await db.roomBlock.findMany({
    where: {
      roomId,
      startDate: { lt: end },
      endDate: { gt: start },
    },
  });

  for (const block of overlappingBlocks) {
    conflicts.push({
      type: "ROOM_BLOCK",
      message: formatRoomBlockConflictMessage(block, room),
    });
  }

  const overlappingPriceRules = await db.roomPriceRule.findMany({
    where: {
      roomId,
      startDate: { lt: end },
      endDate: { gt: start },
    },
    orderBy: { createdAt: "desc" },
  });

  const pricing = calculateStayPricing(Number(room.pricePerNight), start, end, overlappingPriceRules);

  return {
    available: conflicts.length === 0,
    conflicts,
    nights: pricing.nights,
    totalAmount: pricing.totalAmount,
    averagePricePerNight: pricing.averagePricePerNight,
  };
}

/** Lista habitaciones disponibles para un rango y cantidad de huéspedes. */
export async function findAvailableRooms(params: {
  checkIn: string;
  checkOut: string;
  guests?: number;
  type?: Room["type"];
}) {
  await expireStaleHoldReservations();
  const start = toDateOnly(params.checkIn);
  const end = toDateOnly(params.checkOut);
  const guests = params.guests ?? 1;

  const rooms = await prisma.room.findMany({
    where: {
      status: RoomStatus.AVAILABLE,
      maxGuests: { gte: guests },
      ...(params.type ? { type: params.type } : {}),
    },
    orderBy: [{ floor: "asc" }, { code: "asc" }],
  });

  const availableRooms = [];

  for (const room of rooms) {
    const result = await checkRoomAvailability(room.id, start, end);
    if (result.available) {
      availableRooms.push({
        ...room,
        pricePerNight: result.averagePricePerNight,
        basePricePerNight: Number(room.pricePerNight),
        beds: Array.isArray(room.beds) ? (room.beds as unknown[]) : [],
        bathrooms: Array.isArray(room.bathrooms) ? (room.bathrooms as unknown[]) : [],
        amenities: Array.isArray(room.amenities) ? (room.amenities as string[]) : [],
        nights: result.nights,
        totalAmount: result.totalAmount,
      });
    }
  }

  return availableRooms;
}

/** Contexto cuando no hay habitaciones disponibles. */
export async function getAvailabilityEmptyContext(guests: number) {
  const [maxCapacity, roomsForGuests] = await Promise.all([
    prisma.room.aggregate({
      where: { status: RoomStatus.AVAILABLE },
      _max: { maxGuests: true },
    }),
    prisma.room.count({
      where: { status: RoomStatus.AVAILABLE, maxGuests: { gte: guests } },
    }),
  ]);

  const maxHotelGuests = maxCapacity._max.maxGuests ?? 0;

  if (guests > maxHotelGuests && maxHotelGuests > 0) {
    return {
      emptyReason: "GUEST_CAPACITY" as const,
      maxHotelGuests,
      message: `Ninguna habitación admite más de ${maxHotelGuests} huéspedes. Probá con menos personas o contáctanos.`,
    };
  }

  if (roomsForGuests === 0 && guests > 1) {
    return {
      emptyReason: "GUEST_CAPACITY" as const,
      maxHotelGuests,
      message: `No hay habitaciones para ${guests} huéspedes en esas fechas. El máximo del hotel es ${maxHotelGuests}.`,
    };
  }

  return {
    emptyReason: "DATES" as const,
    maxHotelGuests,
    message: "No hay habitaciones libres para esas fechas. Probá otro rango o contáctanos por WhatsApp.",
  };
}

function mapCalendarReservation(
  r: {
    id: string;
    confirmationCode: string;
    roomId: string;
    guestFullName: string;
    guestDocumentType: string | null;
    guestRut: string | null;
    guestPassport: string | null;
    guestBirthDate: Date | null;
    checkIn: Date;
    checkOut: Date;
    paymentStatus: PaymentStatus;
    status: ReservationStatus;
    updatedAt: Date;
    room: { code: string };
    guest: {
      email: string;
      phone: string | null;
      documentType: string;
      rut: string | null;
      passport: string | null;
      birthDate: Date | null;
    };
  },
  historical: boolean
) {
  return {
    id: r.id,
    confirmationCode: r.confirmationCode,
    roomId: r.roomId,
    roomCode: r.room.code,
    guestName: r.guestFullName,
    guestEmail: r.guest.email,
    guestPhone: r.guest.phone,
    guestDocumentType: r.guestDocumentType ?? r.guest.documentType,
    guestRut: r.guestRut ?? r.guest.rut,
    guestPassport: r.guestPassport ?? r.guest.passport,
    guestBirthDate: r.guestBirthDate
      ? formatDateOnlyUTC(r.guestBirthDate)
      : r.guest.birthDate
        ? formatDateOnlyUTC(r.guest.birthDate)
        : null,
    checkIn: formatDateOnlyUTC(r.checkIn),
    checkOut: formatDateOnlyUTC(r.checkOut),
    paymentStatus: r.paymentStatus,
    status: r.status,
    updatedAt: r.updatedAt.toISOString(),
    historical,
  };
}

/** Datos del calendario admin: habitaciones + reservas activas, historial y bloqueos del mes. */
export async function getCalendarData(year: number, month: number) {
  await expireStaleHoldReservations();

  const { monthStart, monthEndExclusive, daysInMonth } = getMonthRangeUTC(year, month);
  const now = new Date();
  const monthRangeWhere = {
    checkIn: { lt: monthEndExclusive },
    checkOut: { gt: monthStart },
  };
  const blockMonthRangeWhere = {
    startDate: { lt: monthEndExclusive },
    endDate: { gt: monthStart },
  };

  const [rooms, activeReservations, historyReservations, roomBlocks] = await Promise.all([
    prisma.room.findMany({
      orderBy: [{ floor: "asc" }, { code: "asc" }],
    }),
    prisma.reservation.findMany({
      where: {
        ...monthRangeWhere,
        status: { in: OCCUPYING_RESERVATION_STATUSES },
        paymentStatus: { not: PaymentStatus.CANCELLED },
        OR: [
          { paymentStatus: PaymentStatus.PAID },
          { paymentStatus: PaymentStatus.PARTIAL },
          {
            paymentStatus: PaymentStatus.PENDING,
            paymentProvider: { not: null },
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
        ],
      },
      include: { guest: true, room: true },
      orderBy: { checkIn: "asc" },
    }),
    prisma.reservation.findMany({
      where: {
        ...monthRangeWhere,
        ...historicalReservationWhere,
      },
      include: { guest: true, room: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.roomBlock.findMany({
      where: blockMonthRangeWhere,
      include: { room: { select: { code: true } } },
      orderBy: { startDate: "asc" },
    }),
  ]);

  return {
    year,
    month,
    daysInMonth,
    rooms: rooms.map((r) => ({
      ...r,
      pricePerNight: Number(r.pricePerNight),
    })),
    reservations: activeReservations.map((r) => mapCalendarReservation(r, false)),
    historyReservations: historyReservations.map((r) => mapCalendarReservation(r, true)),
    roomBlocks: roomBlocks.map((block) => ({
      id: block.id,
      roomId: block.roomId,
      roomCode: block.room.code,
      startDate: formatDateOnlyUTC(block.startDate),
      endDate: formatDateOnlyUTC(block.endDate),
      reason: block.reason,
    })),
  };
}
