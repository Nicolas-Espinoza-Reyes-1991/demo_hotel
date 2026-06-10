import { describe, expect, it } from "vitest";
import {
  formatChileanPhoneInput,
  formatRutInput,
  isValidChileanPhone,
  isValidChileanRut,
  isValidPassport,
  normalizeChileanPhone,
  normalizeRut,
} from "./guest-identity";

describe("guest-identity", () => {
  it("formatea RUT mientras se escribe", () => {
    expect(formatRutInput("180265538")).toBe("18.026.553-8");
    expect(formatRutInput("123456785")).toBe("12.345.678-5");
  });

  it("valida RUT chileno con dígito verificador", () => {
    expect(isValidChileanRut("18.026.553-8")).toBe(true);
    expect(isValidChileanRut("12.345.678-5")).toBe(true);
    expect(isValidChileanRut("12.345.678-0")).toBe(false);
  });

  it("normaliza y valida teléfono móvil chileno", () => {
    expect(normalizeChileanPhone("+56 9 4352 5067")).toBe("+56943525067");
    expect(isValidChileanPhone("+56943525067")).toBe(true);
    expect(formatChileanPhoneInput("943525067")).toBe("+56 9 4352 5067");
  });

  it("valida pasaporte alfanumérico", () => {
    expect(isValidPassport("AB1234567")).toBe(true);
    expect(isValidPassport("A1")).toBe(false);
  });

  it("normaliza RUT con formato estándar", () => {
    expect(normalizeRut("180265538")).toBe("18.026.553-8");
  });
});
