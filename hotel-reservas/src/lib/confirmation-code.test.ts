import { describe, expect, it, vi } from "vitest";
import { buildConfirmationCode, generateUniqueConfirmationCode } from "./confirmation-code";

describe("confirmation-code", () => {
  it("genera código con prefijo BH y fecha de check-in", () => {
    const code = buildConfirmationCode("2026-06-15");
    expect(code).toMatch(/^BH-20260615-[A-F0-9]{4}$/);
  });

  it("genera código único consultando la base", async () => {
    const findUnique = vi
      .fn()
      .mockResolvedValueOnce({ id: "exists" })
      .mockResolvedValueOnce(null);

    const code = await generateUniqueConfirmationCode(
      { reservation: { findUnique } } as never,
      "2026-06-15"
    );

    expect(code).toMatch(/^BH-20260615-/);
    expect(findUnique).toHaveBeenCalledTimes(2);
  });
});
