import { formatDateOnlyUTC, parseDateOnly } from "./dates";

/** Suma años a una fecha YYYY-MM-DD (UTC date-only). */
export function addYearsDateOnly(iso: string, years: number): string {
  const date = parseDateOnly(iso);
  date.setUTCFullYear(date.getUTCFullYear() + years);
  return formatDateOnlyUTC(date);
}

/**
 * Actualiza el año en el nombre de temporada.
 * "Verano 2026" → "Verano 2027"; "Verano" → "Verano 2027".
 */
export function bumpSeasonNameYear(name: string, fromYear: number, toYear: number): string {
  const trimmed = name.trim() || "Temporada";
  const from = String(fromYear);
  const to = String(toYear);
  if (trimmed.includes(from)) {
    return trimmed.split(from).join(to);
  }
  if (/\b(19|20)\d{2}\b/.test(trimmed)) {
    return trimmed.replace(/\b(19|20)\d{2}\b/, to);
  }
  return `${trimmed} ${to}`;
}

export function scalePricePerNight(price: number, percentIncrease: number): number {
  const scaled = Math.round(Number(price) * (1 + percentIncrease / 100));
  return Math.max(1, scaled);
}

export type SeasonCopyInput = {
  name: string;
  startDate: string;
  endDate: string;
  rules: { roomId: string; pricePerNight: number }[];
};

export type SeasonCopyPayload = {
  name: string;
  startDate: string;
  endDate: string;
  items: { roomId: string; pricePerNight: number }[];
};

/** Arma el payload para crear la misma temporada un año después. */
export function buildNextYearSeasonCopy(
  season: SeasonCopyInput,
  percentIncrease = 0
): SeasonCopyPayload {
  const fromYear = Number(season.startDate.slice(0, 4));
  const toYear = fromYear + 1;

  return {
    name: bumpSeasonNameYear(season.name, fromYear, toYear),
    startDate: addYearsDateOnly(season.startDate, 1),
    endDate: addYearsDateOnly(season.endDate, 1),
    items: season.rules.map((rule) => ({
      roomId: rule.roomId,
      pricePerNight: scalePricePerNight(rule.pricePerNight, percentIncrease),
    })),
  };
}
