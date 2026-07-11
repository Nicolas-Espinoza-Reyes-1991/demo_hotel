import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildRobotsTxt,
  buildSitemapEntries,
  getNextRobotsDisallowPaths,
  getPublicSeoRoutes,
  getReservasBasePath,
  getSiteOrigin,
} from "./seo-site";

describe("seo-site", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("resuelve el origen del sitio sin /reservas", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://lacasonadefutrono.cl/reservas");
    vi.stubEnv("NEXT_PUBLIC_WEBSITE_URL", "");
    expect(getSiteOrigin()).toBe("https://lacasonadefutrono.cl");
  });

  it("usa NEXT_PUBLIC_BASE_PATH para el prefijo de reservas", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "/reservas");
    expect(getReservasBasePath()).toBe("/reservas");
  });

  it("incluye solo rutas públicas indexables", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "/reservas");
    const paths = getPublicSeoRoutes().map((route) => route.path);
    expect(paths).toEqual([
      "/",
      "/reservas/",
      "/reservas/terminos",
      "/reservas/privacidad",
    ]);
    expect(paths.join(" ")).not.toMatch(/admin|login|mi-reserva|api/);
  });

  it("bloquea rutas privadas en robots (Next y dominio)", () => {
    expect(getNextRobotsDisallowPaths()).toEqual([
      "/admin",
      "/login",
      "/mi-reserva",
      "/api/",
    ]);

    vi.stubEnv("NEXT_PUBLIC_WEBSITE_URL", "https://lacasonadefutrono.cl");
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "/reservas");
    const robots = buildRobotsTxt();
    expect(robots).toContain("Allow: /");
    expect(robots).toContain("Disallow: /reservas/admin");
    expect(robots).toContain("Disallow: /reservas/login");
    expect(robots).toContain("Disallow: /reservas/mi-reserva");
    expect(robots).toContain("Disallow: /reservas/api/");
    expect(robots).toContain("Sitemap: https://lacasonadefutrono.cl/sitemap.xml");
  });

  it("genera entradas absolutas de sitemap", () => {
    vi.stubEnv("NEXT_PUBLIC_WEBSITE_URL", "https://lacasonadefutrono.cl");
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "/reservas");
    const entries = buildSitemapEntries(new Date("2026-07-11T12:00:00.000Z"));
    expect(entries.map((entry) => entry.url)).toEqual([
      "https://lacasonadefutrono.cl/",
      "https://lacasonadefutrono.cl/reservas/",
      "https://lacasonadefutrono.cl/reservas/terminos",
      "https://lacasonadefutrono.cl/reservas/privacidad",
    ]);
  });
});
