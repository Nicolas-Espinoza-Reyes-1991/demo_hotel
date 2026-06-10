import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyAdminCredentials } from "./auth-credentials";

describe("verifyAdminCredentials", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // Happy path: credenciales planas correctas.
  it("acepta usuario y contraseña correctos", async () => {
    vi.stubEnv("ADMIN_USERNAME", "admin");
    vi.stubEnv("ADMIN_PASSWORD", "secret123");
    expect(await verifyAdminCredentials("admin", "secret123")).toBe(true);
  });

  // Seguridad: usuario incorrecto retorna false.
  it("rechaza usuario incorrecto", async () => {
    vi.stubEnv("ADMIN_USERNAME", "admin");
    vi.stubEnv("ADMIN_PASSWORD", "secret123");
    expect(await verifyAdminCredentials("hacker", "secret123")).toBe(false);
  });

  // Seguridad: contraseña incorrecta retorna false.
  it("rechaza contraseña incorrecta", async () => {
    vi.stubEnv("ADMIN_USERNAME", "admin");
    vi.stubEnv("ADMIN_PASSWORD", "secret123");
    expect(await verifyAdminCredentials("admin", "wrong")).toBe(false);
  });

  // Sin credenciales configuradas retorna false.
  it("rechaza si no hay password ni hash configurado", async () => {
    vi.stubEnv("ADMIN_USERNAME", "admin");
    vi.stubEnv("ADMIN_PASSWORD", "");
    vi.stubEnv("ADMIN_PASSWORD_HASH", "");
    expect(await verifyAdminCredentials("admin", "anything")).toBe(false);
  });
});
