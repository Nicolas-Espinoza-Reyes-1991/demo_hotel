import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn utility", () => {
  // Happy path: combina clases condicionales con clsx.
  it("combina clases truthy y omite falsy", () => {
    expect(cn("base", false && "hidden", "active")).toBe("base active");
  });

  // Soporta objetos de clsx.
  it("acepta objetos de condición", () => {
    expect(cn({ "text-red": true, hidden: false })).toBe("text-red");
  });
});
