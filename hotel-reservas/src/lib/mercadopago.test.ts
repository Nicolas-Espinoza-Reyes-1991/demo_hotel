import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getAppUrl,
  getMercadoPagoCurrency,
  getMercadoPagoPublicKey,
  isMercadoPagoConfigured,
} from "./mercadopago";

describe("mercadopago config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // Happy path: detecta MP configurado con ambas claves.
  it("isMercadoPagoConfigured es true con tokens presentes", () => {
    vi.stubEnv("MERCADOPAGO_ACCESS_TOKEN", "APP_USR-token");
    vi.stubEnv("NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY", "APP_USR-public");
    expect(isMercadoPagoConfigured()).toBe(true);
  });

  // Edge case: falta clave pública.
  it("isMercadoPagoConfigured es false sin public key", () => {
    vi.stubEnv("MERCADOPAGO_ACCESS_TOKEN", "APP_USR-token");
    vi.stubEnv("NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY", "");
    expect(isMercadoPagoConfigured()).toBe(false);
  });

  // getMercadoPagoPublicKey retorna null si la variable no está definida.
  it("getMercadoPagoPublicKey retorna null sin variable", () => {
    vi.unstubAllEnvs();
    delete process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY;
    expect(getMercadoPagoPublicKey()).toBeNull();
  });

  // Moneda por defecto USD.
  it("getMercadoPagoCurrency usa USD por defecto", () => {
    vi.stubEnv("MERCADOPAGO_CURRENCY", "");
    expect(getMercadoPagoCurrency()).toBe("USD");
  });

  // APP_URL fallback localhost.
  it("getAppUrl usa localhost:3000 por defecto", () => {
    vi.stubEnv("APP_URL", "");
    expect(getAppUrl()).toBe("http://localhost:3000");
  });
});
