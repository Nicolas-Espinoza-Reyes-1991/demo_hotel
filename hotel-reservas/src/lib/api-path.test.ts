import { afterEach, describe, expect, it, vi } from "vitest";
import { apiPath, publicAssetUrl } from "./api-path";

describe("apiPath", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("devuelve la ruta sin prefijo si no hay basePath", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "");
    expect(apiPath("/api/auth/login")).toBe("/api/auth/login");
  });

  it("prefija con /reservas en producción por IP", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "/reservas");
    expect(apiPath("/api/auth/login")).toBe("/reservas/api/auth/login");
    expect(apiPath("/logo-casona.png")).toBe("/reservas/logo-casona.png");
  });

  it("publicAssetUrl codifica espacios en rutas locales", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "/reservas");
    expect(publicAssetUrl("/habitaciones/foto habitacion.jpeg")).toBe(
      "/reservas/habitaciones/foto%20habitacion.jpeg"
    );
  });

  it("publicAssetUrl deja URLs absolutas intactas", () => {
    expect(publicAssetUrl("https://cdn.example.com/a.jpg")).toBe("https://cdn.example.com/a.jpg");
  });
});
