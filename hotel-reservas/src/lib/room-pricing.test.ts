import { describe, expect, it } from "vitest";
import {
  calculateStayPricing,
  eachStayNight,
  priceRuleRangesOverlap,
  resolveNightPrice,
  ruleCoversNight,
} from "./room-pricing";
import { parseDateOnly } from "./dates";

describe("room-pricing", () => {
  it("itera noches half-open [checkIn, checkOut)", () => {
    const nights = eachStayNight("2026-12-15", "2026-12-18");
    expect(nights.map((d) => d.toISOString().slice(0, 10))).toEqual([
      "2026-12-15",
      "2026-12-16",
      "2026-12-17",
    ]);
  });

  it("usa precio base si no hay reglas", () => {
    const pricing = calculateStayPricing(100, "2026-06-10", "2026-06-13", []);
    expect(pricing.nights).toBe(3);
    expect(pricing.totalAmount).toBe(300);
    expect(pricing.averagePricePerNight).toBe(100);
  });

  it("aplica tarifa de temporada noche a noche", () => {
    const pricing = calculateStayPricing(100, "2026-12-20", "2026-12-23", [
      {
        id: "summer",
        startDate: parseDateOnly("2026-12-15"),
        endDate: parseDateOnly("2027-03-15"),
        pricePerNight: 180,
        name: "Verano",
      },
    ]);

    expect(pricing.nights).toBe(3);
    expect(pricing.totalAmount).toBe(540);
    expect(pricing.averagePricePerNight).toBe(180);
    expect(pricing.breakdown.every((n) => n.ruleName === "Verano")).toBe(true);
  });

  it("mezcla noches base y temporada en la misma estadía", () => {
    const pricing = calculateStayPricing(100, "2026-12-13", "2026-12-17", [
      {
        id: "summer",
        startDate: parseDateOnly("2026-12-15"),
        endDate: parseDateOnly("2027-03-15"),
        pricePerNight: 200,
        name: "Verano",
      },
    ]);

    // 13,14 base; 15,16 temporada
    expect(pricing.breakdown.map((n) => n.pricePerNight)).toEqual([100, 100, 200, 200]);
    expect(pricing.totalAmount).toBe(600);
    expect(pricing.averagePricePerNight).toBe(150);
  });

  it("ruleCoversNight respeta fin exclusivo", () => {
    const rule = {
      startDate: parseDateOnly("2026-12-15"),
      endDate: parseDateOnly("2026-12-20"),
    };
    expect(ruleCoversNight(rule, parseDateOnly("2026-12-15"))).toBe(true);
    expect(ruleCoversNight(rule, parseDateOnly("2026-12-19"))).toBe(true);
    expect(ruleCoversNight(rule, parseDateOnly("2026-12-20"))).toBe(false);
  });

  it("si hay solape, gana la regla más reciente", () => {
    const night = parseDateOnly("2026-12-20");
    const resolved = resolveNightPrice(100, night, [
      {
        id: "old",
        startDate: parseDateOnly("2026-12-01"),
        endDate: parseDateOnly("2027-01-01"),
        pricePerNight: 150,
        createdAt: new Date("2026-01-01"),
      },
      {
        id: "new",
        startDate: parseDateOnly("2026-12-15"),
        endDate: parseDateOnly("2026-12-25"),
        pricePerNight: 220,
        createdAt: new Date("2026-06-01"),
      },
    ]);
    expect(resolved.ruleId).toBe("new");
    expect(resolved.pricePerNight).toBe(220);
  });

  it("detecta solape de tarifas", () => {
    expect(
      priceRuleRangesOverlap("2026-12-01", "2026-12-20", "2026-12-15", "2027-01-01")
    ).toBe(true);
    expect(
      priceRuleRangesOverlap("2026-12-01", "2026-12-15", "2026-12-15", "2027-01-01")
    ).toBe(false);
  });
});
