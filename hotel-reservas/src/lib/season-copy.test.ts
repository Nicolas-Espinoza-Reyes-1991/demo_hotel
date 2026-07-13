import { describe, expect, it } from "vitest";
import {
  addYearsDateOnly,
  buildNextYearSeasonCopy,
  bumpSeasonNameYear,
  scalePricePerNight,
} from "./season-copy";

describe("season-copy", () => {
  it("suma un año a fechas date-only", () => {
    expect(addYearsDateOnly("2026-12-15", 1)).toBe("2027-12-15");
    expect(addYearsDateOnly("2027-03-15", 1)).toBe("2028-03-15");
  });

  it("actualiza el año en el nombre", () => {
    expect(bumpSeasonNameYear("Verano 2026", 2026, 2027)).toBe("Verano 2027");
    expect(bumpSeasonNameYear("Verano", 2026, 2027)).toBe("Verano 2027");
    expect(bumpSeasonNameYear("Fin de año 2026", 2026, 2027)).toBe("Fin de año 2027");
  });

  it("escala precios con porcentaje", () => {
    expect(scalePricePerNight(100000, 0)).toBe(100000);
    expect(scalePricePerNight(100000, 10)).toBe(110000);
  });

  it("arma copia al año siguiente con precios", () => {
    const payload = buildNextYearSeasonCopy(
      {
        name: "Verano 2026",
        startDate: "2026-12-15",
        endDate: "2027-03-15",
        rules: [
          { roomId: "r1", pricePerNight: 80000 },
          { roomId: "r2", pricePerNight: 90000 },
        ],
      },
      10
    );

    expect(payload).toEqual({
      name: "Verano 2027",
      startDate: "2027-12-15",
      endDate: "2028-03-15",
      items: [
        { roomId: "r1", pricePerNight: 88000 },
        { roomId: "r2", pricePerNight: 99000 },
      ],
    });
  });
});
