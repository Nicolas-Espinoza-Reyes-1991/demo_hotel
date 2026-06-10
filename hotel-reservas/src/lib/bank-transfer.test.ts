import { afterEach, describe, expect, it, vi } from "vitest";
import { PaymentStatus, ReservationStatus } from "@prisma/client";
import { getBankTransferConfig, isBankTransferEnabled } from "./bank-transfer";

describe("bank-transfer config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // Happy path: configuración completa habilita transferencia.
  it("getBankTransferConfig retorna datos cuando env está completo", () => {
    vi.stubEnv("BANK_TRANSFER_ENABLED", "true");
    vi.stubEnv("BANK_NAME", "Banco Test");
    vi.stubEnv("BANK_ACCOUNT_HOLDER", "Hotel SA");
    vi.stubEnv("BANK_ACCOUNT_NUMBER", "123456");
    vi.stubEnv("BANK_ALIAS", "hotel.test");

    const config = getBankTransferConfig();
    expect(config?.enabled).toBe(true);
    expect(config?.bankName).toBe("Banco Test");
    expect(config?.alias).toBe("hotel.test");
    expect(isBankTransferEnabled()).toBe(true);
  });

  // Edge case: explícitamente deshabilitado.
  it("retorna null si BANK_TRANSFER_ENABLED=false", () => {
    vi.stubEnv("BANK_TRANSFER_ENABLED", "false");
    vi.stubEnv("BANK_NAME", "Banco");
    vi.stubEnv("BANK_ACCOUNT_HOLDER", "Hotel");
    vi.stubEnv("BANK_ACCOUNT_NUMBER", "1");
    expect(getBankTransferConfig()).toBeNull();
  });

  // Campos obligatorios faltantes deshabilitan transferencia.
  it("retorna null si faltan datos bancarios obligatorios", () => {
    vi.stubEnv("BANK_TRANSFER_ENABLED", "true");
    vi.stubEnv("BANK_NAME", "");
    expect(getBankTransferConfig()).toBeNull();
  });
});
