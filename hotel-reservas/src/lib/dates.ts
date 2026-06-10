import { differenceInCalendarDays } from "date-fns";

/** YYYY-MM-DD en UTC (sin desfase por zona horaria). */
export function formatDateOnlyUTC(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parsea YYYY-MM-DD a Date estable (mediodía UTC). */
export function parseDateOnly(value: string): Date {
  return new Date(`${value.slice(0, 10)}T12:00:00.000Z`);
}

/** Normaliza fechas de reserva a mediodía UTC para comparaciones consistentes. */
export function toDateOnly(value: Date | string): Date {
  if (typeof value === "string") {
    return parseDateOnly(value);
  }
  return parseDateOnly(formatDateOnlyUTC(value));
}

/** Rango [inicio, fin) de un mes calendario en UTC. */
export function getMonthRangeUTC(year: number, month: number) {
  const monthStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const monthEndExclusive = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  return { monthStart, monthEndExclusive, daysInMonth: new Date(Date.UTC(year, month, 0)).getUTCDate() };
}

/** Calcula noches entre check-in y check-out (check-out es exclusivo). */
export function calculateNights(checkIn: Date | string, checkOut: Date | string): number {
  const nights = differenceInCalendarDays(toDateOnly(checkOut), toDateOnly(checkIn));
  return nights;
}

/** Formato ISO date (YYYY-MM-DD) para inputs HTML y API. */
export function formatDateISO(date: Date): string {
  return formatDateOnlyUTC(date);
}

/** Formatea moneda para UI (CLP por defecto en Chile). */
export function getDisplayCurrency(): string {
  return (
    process.env.NEXT_PUBLIC_DISPLAY_CURRENCY?.trim() ||
    process.env.MERCADOPAGO_CURRENCY?.trim() ||
    "CLP"
  );
}

export function formatCurrency(
  amount: number | string,
  locale = "es-CL",
  currency = getDisplayCurrency()
): string {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: currency === "CLP" ? 0 : 2,
  }).format(value);
}

const STAY_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
};

/** Rango de estadía legible (ej. 10 jun 2026 al 11 jun 2026). */
export function formatStayRange(checkIn: string, checkOut: string): string {
  const start = parseDateOnly(checkIn.slice(0, 10));
  const end = parseDateOnly(checkOut.slice(0, 10));
  return `${start.toLocaleDateString("es-CL", STAY_DATE_OPTIONS)} al ${end.toLocaleDateString("es-CL", STAY_DATE_OPTIONS)}`;
}

/** Etiqueta de noches con plural correcto. */
export function formatNightsLabel(nights: number): string {
  if (nights === 1) return "1 noche";
  return `${nights} noches`;
}
