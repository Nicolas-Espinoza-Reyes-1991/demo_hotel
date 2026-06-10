import { describe, expect, it } from "vitest";
import {
  calculateNights,
  formatDateISO,
  formatDateOnlyUTC,
  getMonthRangeUTC,
  parseDateOnly,
  toDateOnly,
} from "./dates";

describe("dates — UTC y noches", () => {
  // Happy path: cálculo de noches entre dos fechas date-only.
  it("calcula noches con check-out exclusivo", () => {
    expect(calculateNights("2026-06-10", "2026-06-13")).toBe(3);
  });

  // Edge case: mismo día retorna 0 noches.
  it("retorna 0 noches si check-in y check-out son el mismo día", () => {
    expect(calculateNights("2026-06-10", "2026-06-10")).toBe(0);
  });

  // Zona horaria: parseDateOnly usa mediodía UTC para evitar desfases.
  it("parseDateOnly normaliza a mediodía UTC", () => {
    const date = parseDateOnly("2026-06-10");
    expect(date.toISOString()).toBe("2026-06-10T12:00:00.000Z");
  });

  // toDateOnly desde string y Date produce el mismo resultado UTC.
  it("toDateOnly es consistente entre string y Date", () => {
    const fromString = toDateOnly("2026-06-10");
    const fromDate = toDateOnly(new Date("2026-06-10T23:59:59.000Z"));
    expect(formatDateOnlyUTC(fromString)).toBe(formatDateOnlyUTC(fromDate));
  });

  // getMonthRangeUTC devuelve rango correcto para junio 2026.
  it("getMonthRangeUTC calcula días del mes en UTC", () => {
    const { monthStart, monthEndExclusive, daysInMonth } = getMonthRangeUTC(2026, 6);
    expect(monthStart.toISOString()).toBe("2026-06-01T00:00:00.000Z");
    expect(monthEndExclusive.toISOString()).toBe("2026-07-01T00:00:00.000Z");
    expect(daysInMonth).toBe(30);
  });

  // formatDateISO es alias de formatDateOnlyUTC.
  it("formatDateISO devuelve YYYY-MM-DD", () => {
    expect(formatDateISO(parseDateOnly("2026-12-25"))).toBe("2026-12-25");
  });
});
