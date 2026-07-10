import { afterEach, describe, expect, it, vi } from "vitest";
import { getEmailLogoUrl } from "./email-layout";

describe("getEmailLogoUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("usa PNG del sitio principal en producción", () => {
    vi.stubEnv("NEXT_PUBLIC_WEBSITE_URL", "https://lacasonadefutrono.cl");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://lacasonadefutrono.cl");
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "/reservas");

    expect(getEmailLogoUrl()).toBe("https://lacasonadefutrono.cl/assets/logo-casona.png");
  });

  it("normaliza URL de demo local con HTML", () => {
    vi.stubEnv(
      "NEXT_PUBLIC_WEBSITE_URL",
      "http://localhost:5501/propuesta-7-casona-futrono.html"
    );

    expect(getEmailLogoUrl()).toBe("http://localhost:5501/assets/logo-casona.png");
  });

  it("elimina barra final de la URL del sitio", () => {
    vi.stubEnv("NEXT_PUBLIC_WEBSITE_URL", "https://lacasonadefutrono.cl/");

    expect(getEmailLogoUrl()).toBe("https://lacasonadefutrono.cl/assets/logo-casona.png");
  });
});
