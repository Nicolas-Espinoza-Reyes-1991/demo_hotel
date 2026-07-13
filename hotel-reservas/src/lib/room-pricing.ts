import { formatDateOnlyUTC, toDateOnly } from "./dates";

export type PriceRuleLike = {
  id?: string;
  startDate: Date;
  endDate: Date;
  pricePerNight: number | string;
  name?: string | null;
  createdAt?: Date;
};

export type NightPrice = {
  date: string;
  pricePerNight: number;
  ruleId?: string;
  ruleName?: string | null;
};

export type StayPricing = {
  nights: number;
  totalAmount: number;
  averagePricePerNight: number;
  breakdown: NightPrice[];
};

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/** Noches en [checkIn, checkOut) como fechas date-only UTC. */
export function eachStayNight(checkIn: Date | string, checkOut: Date | string): Date[] {
  const start = toDateOnly(checkIn);
  const end = toDateOnly(checkOut);
  const nights: Date[] = [];
  let cursor = start;
  while (cursor < end) {
    nights.push(cursor);
    cursor = addUtcDays(cursor, 1);
  }
  return nights;
}

/** ¿La noche (date-only) cae en el rango de tarifa [start, end)? */
export function ruleCoversNight(rule: { startDate: Date; endDate: Date }, night: Date): boolean {
  const start = toDateOnly(rule.startDate);
  const end = toDateOnly(rule.endDate);
  return night >= start && night < end;
}

/**
 * Elige la tarifa aplicable a una noche.
 * Si hubiera solapes (no deberían existir), gana la más reciente por createdAt.
 */
export function resolveNightPrice(
  basePricePerNight: number,
  night: Date,
  rules: PriceRuleLike[]
): NightPrice {
  const date = formatDateOnlyUTC(night);
  const matching = rules.filter((rule) => ruleCoversNight(rule, night));

  if (matching.length === 0) {
    return { date, pricePerNight: basePricePerNight };
  }

  matching.sort((a, b) => {
    const aTime = a.createdAt?.getTime() ?? 0;
    const bTime = b.createdAt?.getTime() ?? 0;
    return bTime - aTime;
  });

  const chosen = matching[0];
  return {
    date,
    pricePerNight: Number(chosen.pricePerNight),
    ruleId: chosen.id,
    ruleName: chosen.name ?? null,
  };
}

/** Total de estadía sumando precio por noche (base o regla de temporada). */
export function calculateStayPricing(
  basePricePerNight: number,
  checkIn: Date | string,
  checkOut: Date | string,
  rules: PriceRuleLike[] = []
): StayPricing {
  const nights = eachStayNight(checkIn, checkOut);
  if (nights.length === 0) {
    return { nights: 0, totalAmount: 0, averagePricePerNight: 0, breakdown: [] };
  }

  const breakdown = nights.map((night) => resolveNightPrice(basePricePerNight, night, rules));
  const totalAmount = breakdown.reduce((sum, night) => sum + night.pricePerNight, 0);
  const averagePricePerNight = totalAmount / nights.length;

  return {
    nights: nights.length,
    totalAmount,
    averagePricePerNight,
    breakdown,
  };
}

/** Detecta solape de rangos half-open [start, end). */
export function priceRuleRangesOverlap(
  aStart: Date | string,
  aEnd: Date | string,
  bStart: Date | string,
  bEnd: Date | string
): boolean {
  const startA = toDateOnly(aStart);
  const endA = toDateOnly(aEnd);
  const startB = toDateOnly(bStart);
  const endB = toDateOnly(bEnd);
  return startA < endB && startB < endA;
}
