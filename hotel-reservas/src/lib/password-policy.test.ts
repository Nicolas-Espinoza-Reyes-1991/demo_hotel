import { describe, expect, it } from "vitest";
import {
  evaluatePassword,
  getPasswordValidationError,
  getUsernameValidationError,
  passwordsMatch,
} from "./password-policy";

describe("password-policy", () => {
  it("acepta contraseña fuerte válida", () => {
    const result = evaluatePassword("Hotel2026!");
    expect(result.valid).toBe(true);
    expect(result.strength).toBe("strong");
  });

  it("rechaza contraseña corta", () => {
    expect(evaluatePassword("Ab1!").valid).toBe(false);
    expect(getPasswordValidationError("Ab1!")).toMatch(/8 caracteres/i);
  });

  it("exige coincidencia de confirmación", () => {
    expect(passwordsMatch("Hotel2026!", "Hotel2026!")).toBe(true);
    expect(getPasswordValidationError("Hotel2026!", "otra")).toMatch(/no coinciden/i);
  });

  it("valida username", () => {
    expect(getUsernameValidationError("ab")).toBeTruthy();
    expect(getUsernameValidationError("recepcion")).toBeNull();
    expect(getUsernameValidationError("bad user")).toBeTruthy();
  });
});
