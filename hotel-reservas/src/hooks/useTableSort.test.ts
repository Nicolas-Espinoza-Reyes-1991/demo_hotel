import { describe, expect, it } from "vitest";
import { compareSortValues } from "@/hooks/useTableSort";

describe("compareSortValues", () => {
  it("ordena texto ascendente", () => {
    expect(compareSortValues("Ana", "Zoe", "asc")).toBeLessThan(0);
    expect(compareSortValues("Zoe", "Ana", "desc")).toBeLessThan(0);
  });

  it("ordena números", () => {
    expect(compareSortValues(55, 65, "asc")).toBeLessThan(0);
    expect(compareSortValues(65, 55, "desc")).toBeLessThan(0);
  });

  it("ordena fechas ISO como texto", () => {
    expect(compareSortValues("2026-08-01", "2026-08-10", "asc")).toBeLessThan(0);
  });
});
