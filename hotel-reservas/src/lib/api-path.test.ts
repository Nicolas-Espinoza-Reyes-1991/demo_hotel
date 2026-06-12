import { describe, expect, it, vi } from "vitest";
import { apiPath } from "./api-path";

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
    expect(apiPath("/logo-bh.png")).toBe("/reservas/logo-bh.png");
  });
});
