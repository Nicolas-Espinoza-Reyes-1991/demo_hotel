import { describe, expect, it } from "vitest";
import { firstZodErrorMessage, zodFieldErrorMap } from "./zod-form-errors";

describe("zod-form-errors", () => {
  it("extrae mensaje de campo guest.rut", () => {
    const msg = firstZodErrorMessage({
      fieldErrors: { "guest.rut": ["RUT inválido. Verificá el dígito verificador."] },
    });
    expect(msg).toMatch(/RUT inválido/i);
  });

  it("mapea errores de guest a campos planos", () => {
    const map = zodFieldErrorMap({
      fieldErrors: { "guest.phone": ["Teléfono inválido."] },
    });
    expect(map.phone).toBe("Teléfono inválido.");
  });
});
