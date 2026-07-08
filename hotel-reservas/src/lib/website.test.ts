import { afterEach, describe, expect, it, vi } from "vitest";
import { getWebsiteUrl } from "./website";
import { hotelConfig } from "@/config/hotel";

describe("getWebsiteUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // Happy path: usa variable de entorno cuando está definida.
  it("retorna NEXT_PUBLIC_WEBSITE_URL si está configurada", () => {
    vi.stubEnv("NEXT_PUBLIC_WEBSITE_URL", "https://hotel.example.com");
    expect(getWebsiteUrl()).toBe("https://hotel.example.com");
  });

  // Desarrollo: fallback a landing local en puerto 5501.
  it("en development usa localhost:5501 por defecto", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_WEBSITE_URL", "");
    expect(getWebsiteUrl()).toBe("http://localhost:5501/propuesta-7-casona-futrono.html");
  });

  // Producción: fallback al sitio del hotel definido en hotel.config.json.
  it("en production usa el sitio del config por defecto", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_WEBSITE_URL", "");
    expect(getWebsiteUrl()).toBe(hotelConfig.urls.site);
  });
});
