import { PaymentStatus, ReservationStatus } from "@prisma/client";
import { formatDateOnlyUTC, toDateOnly } from "./dates";
import { getAmountPaid, getBalanceDue, toMoney } from "./reservation-payment";

export type ReportReservationInput = {
  id: string;
  confirmationCode: string;
  roomId: string;
  roomCode: string;
  roomName?: string;
  guestFullName: string;
  checkIn: Date | string;
  checkOut: Date | string;
  nights: number;
  totalAmount: number | string;
  amountPaid?: number | string | null;
  paymentStatus: PaymentStatus | string;
  paymentProvider?: string | null;
  status: ReservationStatus | string;
  createdAt: Date | string;
};

export type ReportDayPoint = {
  date: string;
  arrivals: number;
  collected: number;
  committed: number;
  occupiedNights: number;
  occupancyPercent: number;
};

export type ReportRoomRank = {
  roomId: string;
  roomCode: string;
  roomName: string;
  nightsSold: number;
  collected: number;
  committed: number;
  adr: number;
  reservations: number;
};

export type ReportBalanceRow = {
  id: string;
  confirmationCode: string;
  roomCode: string;
  guestFullName: string;
  checkIn: string;
  checkOut: string;
  paymentStatus: string;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
};

export type ReportProviderBucket = {
  provider: string;
  collected: number;
  reservations: number;
};

export type AdminReportsResult = {
  from: string;
  to: string;
  daysInPeriod: number;
  roomCount: number;
  summary: {
    createdCount: number;
    arrivalsCount: number;
    nightsSold: number;
    occupancyPercent: number;
    collected: number;
    committed: number;
    balanceDue: number;
    paidCount: number;
    partialCount: number;
    pendingCount: number;
    cancelledCount: number;
    adr: number;
  };
  revenueByDay: ReportDayPoint[];
  occupancyByDay: ReportDayPoint[];
  roomRanking: ReportRoomRank[];
  balances: ReportBalanceRow[];
  byProvider: ReportProviderBucket[];
};

function asDateOnly(value: Date | string): string {
  if (typeof value === "string") return value.slice(0, 10);
  return formatDateOnlyUTC(toDateOnly(value));
}

function addDaysIso(iso: string, days: number): string {
  const date = toDateOnly(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateOnlyUTC(date);
}

function eachDayInclusive(from: string, to: string): string[] {
  const days: string[] = [];
  let cursor = from;
  while (cursor <= to) {
    days.push(cursor);
    cursor = addDaysIso(cursor, 1);
  }
  return days;
}

/** Noches de la reserva que caen en [from, to] inclusive (check-out exclusivo). */
export function countOverlapNights(
  checkIn: string,
  checkOut: string,
  from: string,
  to: string
): number {
  const start = checkIn > from ? checkIn : from;
  const endExclusive = checkOut;
  const periodEndExclusive = addDaysIso(to, 1);
  const end = endExclusive < periodEndExclusive ? endExclusive : periodEndExclusive;
  if (end <= start) return 0;

  let nights = 0;
  let cursor = start;
  while (cursor < end) {
    nights += 1;
    cursor = addDaysIso(cursor, 1);
  }
  return nights;
}

function isCancelledLike(reservation: ReportReservationInput): boolean {
  return (
    reservation.paymentStatus === PaymentStatus.CANCELLED ||
    reservation.paymentStatus === PaymentStatus.REFUNDED ||
    reservation.status === ReservationStatus.CANCELLED
  );
}

function occupiesInventory(reservation: ReportReservationInput): boolean {
  if (isCancelledLike(reservation)) return false;
  if (reservation.paymentStatus === PaymentStatus.PAID) return true;
  if (reservation.paymentStatus === PaymentStatus.PARTIAL) return true;
  if (reservation.paymentStatus === PaymentStatus.PENDING) return true;
  return false;
}

function providerLabel(provider: string | null | undefined): string {
  if (!provider) return "Sin medio / manual";
  if (provider === "mercadopago") return "Mercado Pago";
  if (provider === "bank_transfer") return "Transferencia";
  return provider;
}

export function buildAdminReports(params: {
  from: string;
  to: string;
  roomCount: number;
  rooms: { id: string; code: string; name: string }[];
  reservations: ReportReservationInput[];
}): AdminReportsResult {
  const from = params.from.slice(0, 10);
  const to = params.to.slice(0, 10);
  if (to < from) {
    throw new Error("La fecha hasta debe ser posterior o igual a desde.");
  }

  const days = eachDayInclusive(from, to);
  const daysInPeriod = days.length;
  const roomCount = Math.max(0, params.roomCount);
  const capacity = roomCount * daysInPeriod;

  const roomNameById = new Map(params.rooms.map((room) => [room.id, room.name]));

  let createdCount = 0;
  let arrivalsCount = 0;
  let nightsSold = 0;
  let collected = 0;
  let committed = 0;
  let paidCount = 0;
  let partialCount = 0;
  let pendingCount = 0;
  let cancelledCount = 0;

  const dayMap = new Map<string, ReportDayPoint>();
  for (const date of days) {
    dayMap.set(date, {
      date,
      arrivals: 0,
      collected: 0,
      committed: 0,
      occupiedNights: 0,
      occupancyPercent: 0,
    });
  }

  const roomAgg = new Map<
    string,
    { roomCode: string; roomName: string; nightsSold: number; collected: number; committed: number; reservations: number }
  >();
  const providerAgg = new Map<string, { collected: number; reservations: number }>();
  const balances: ReportBalanceRow[] = [];

  for (const reservation of params.reservations) {
    const checkIn = asDateOnly(reservation.checkIn);
    const checkOut = asDateOnly(reservation.checkOut);
    const createdAt = asDateOnly(reservation.createdAt);
    const total = toMoney(Number(reservation.totalAmount));
    const paid = getAmountPaid(reservation);
    const balance = getBalanceDue(reservation);
    const cancelled = isCancelledLike(reservation);

    if (createdAt >= from && createdAt <= to) {
      createdCount += 1;
    }

    if (cancelled) {
      if (checkIn >= from && checkIn <= to) cancelledCount += 1;
      continue;
    }

    const isArrival = checkIn >= from && checkIn <= to;
    if (isArrival) {
      arrivalsCount += 1;
      collected = toMoney(collected + paid);
      committed = toMoney(committed + total);
      if (reservation.paymentStatus === PaymentStatus.PAID) paidCount += 1;
      if (reservation.paymentStatus === PaymentStatus.PARTIAL) partialCount += 1;
      if (reservation.paymentStatus === PaymentStatus.PENDING) pendingCount += 1;

      const day = dayMap.get(checkIn);
      if (day) {
        day.arrivals += 1;
        day.collected = toMoney(day.collected + paid);
        day.committed = toMoney(day.committed + total);
      }

      const provider = providerLabel(reservation.paymentProvider);
      const bucket = providerAgg.get(provider) ?? { collected: 0, reservations: 0 };
      bucket.collected = toMoney(bucket.collected + paid);
      bucket.reservations += 1;
      providerAgg.set(provider, bucket);
    }

    if (occupiesInventory(reservation)) {
      const overlap = countOverlapNights(checkIn, checkOut, from, to);
      nightsSold += overlap;

      let cursor = checkIn > from ? checkIn : from;
      const end = checkOut < addDaysIso(to, 1) ? checkOut : addDaysIso(to, 1);
      while (cursor < end) {
        const point = dayMap.get(cursor);
        if (point) point.occupiedNights += 1;
        cursor = addDaysIso(cursor, 1);
      }

      if (overlap > 0) {
        const current = roomAgg.get(reservation.roomId) ?? {
          roomCode: reservation.roomCode,
          roomName: reservation.roomName ?? roomNameById.get(reservation.roomId) ?? reservation.roomCode,
          nightsSold: 0,
          collected: 0,
          committed: 0,
          reservations: 0,
        };
        current.nightsSold += overlap;
        if (isArrival) {
          current.collected = toMoney(current.collected + paid);
          current.committed = toMoney(current.committed + total);
          current.reservations += 1;
        }
        roomAgg.set(reservation.roomId, current);
      }
    }

    if (balance > 0 && (reservation.paymentStatus === PaymentStatus.PARTIAL || reservation.paymentStatus === PaymentStatus.PENDING)) {
      // Saldos abiertos que aún cruzan o empiezan en/después del inicio del período.
      if (checkOut > from) {
        balances.push({
          id: reservation.id,
          confirmationCode: reservation.confirmationCode,
          roomCode: reservation.roomCode,
          guestFullName: reservation.guestFullName,
          checkIn,
          checkOut,
          paymentStatus: String(reservation.paymentStatus),
          totalAmount: total,
          amountPaid: paid,
          balanceDue: balance,
        });
      }
    }
  }

  for (const point of dayMap.values()) {
    const dayCapacity = Math.max(1, roomCount);
    point.occupancyPercent = roomCount > 0 ? Math.round((point.occupiedNights / dayCapacity) * 100) : 0;
  }

  const occupancyPercent = capacity > 0 ? Math.round((nightsSold / capacity) * 100) : 0;
  const adr = nightsSold > 0 ? toMoney(committed / nightsSold) : 0;

  const roomRanking: ReportRoomRank[] = [...roomAgg.entries()]
    .map(([roomId, value]) => ({
      roomId,
      roomCode: value.roomCode,
      roomName: value.roomName,
      nightsSold: value.nightsSold,
      collected: value.collected,
      committed: value.committed,
      adr: value.nightsSold > 0 ? toMoney(value.committed / value.nightsSold) : 0,
      reservations: value.reservations,
    }))
    .sort((a, b) => b.committed - a.committed || b.nightsSold - a.nightsSold);

  balances.sort((a, b) => a.checkIn.localeCompare(b.checkIn) || b.balanceDue - a.balanceDue);

  const byProvider: ReportProviderBucket[] = [...providerAgg.entries()]
    .map(([provider, value]) => ({
      provider,
      collected: value.collected,
      reservations: value.reservations,
    }))
    .sort((a, b) => b.collected - a.collected);

  const revenueByDay = days.map((date) => dayMap.get(date)!);
  const occupancyByDay = revenueByDay;

  return {
    from,
    to,
    daysInPeriod,
    roomCount,
    summary: {
      createdCount,
      arrivalsCount,
      nightsSold,
      occupancyPercent,
      collected,
      committed,
      balanceDue: toMoney(balances.reduce((sum, row) => sum + row.balanceDue, 0)),
      paidCount,
      partialCount,
      pendingCount,
      cancelledCount,
      adr,
    },
    revenueByDay,
    occupancyByDay,
    roomRanking,
    balances,
    byProvider,
  };
}

export function toCsv(rows: Record<string, string | number>[], columns: { key: string; label: string }[]): string {
  const escape = (value: string | number) => {
    const text = String(value ?? "");
    if (/[",\n;]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  };
  const header = columns.map((column) => escape(column.label)).join(";");
  const body = rows.map((row) => columns.map((column) => escape(row[column.key] ?? "")).join(";")).join("\n");
  return `${header}\n${body}`;
}
