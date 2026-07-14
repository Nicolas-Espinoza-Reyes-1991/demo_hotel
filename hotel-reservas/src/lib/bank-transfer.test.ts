import { afterEach, describe, expect, it, vi } from "vitest";

const { mockFindUnique } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    bankTransferSettings: {
      findUnique: mockFindUnique,
    },
  },
}));

import {
  getBankTransferConfig,
  getBankTransferConfigFromEnv,
  isBankTransferEnabled,
} from "./bank-transfer";

describe("bank-transfer config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    mockFindUnique.mockReset();
  });

  it("getBankTransferConfigFromEnv retorna datos cuando env está completo", () => {
    vi.stubEnv("BANK_TRANSFER_ENABLED", "true");
    vi.stubEnv("BANK_NAME", "Banco Test");
    vi.stubEnv("BANK_ACCOUNT_HOLDER", "Hotel SA");
    vi.stubEnv("BANK_ACCOUNT_NUMBER", "123456");
    vi.stubEnv("BANK_TAX_ID", "76.556.843-9");
    vi.stubEnv("BANK_ALIAS", "hotel.test");

    const config = getBankTransferConfigFromEnv();
    expect(config?.enabled).toBe(true);
    expect(config?.bankName).toBe("Banco Test");
    expect(config?.taxId).toBe("76.556.843-9");
    expect(config?.alias).toBe("hotel.test");
  });

  it("retorna null si BANK_TRANSFER_ENABLED=false", () => {
    vi.stubEnv("BANK_TRANSFER_ENABLED", "false");
    vi.stubEnv("BANK_NAME", "Banco");
    vi.stubEnv("BANK_ACCOUNT_HOLDER", "Hotel");
    vi.stubEnv("BANK_ACCOUNT_NUMBER", "1");
    expect(getBankTransferConfigFromEnv()).toBeNull();
  });

  it("retorna null si faltan datos bancarios obligatorios", () => {
    vi.stubEnv("BANK_TRANSFER_ENABLED", "true");
    vi.stubEnv("BANK_NAME", "");
    expect(getBankTransferConfigFromEnv()).toBeNull();
  });

  it("prioriza la fila de DB sobre el env", async () => {
    vi.stubEnv("BANK_NAME", "Banco Env");
    vi.stubEnv("BANK_ACCOUNT_HOLDER", "Env Holder");
    vi.stubEnv("BANK_ACCOUNT_NUMBER", "111");
    mockFindUnique.mockResolvedValue({
      id: "default",
      enabled: true,
      bankName: "Banco DB",
      accountHolder: "Titular DB",
      accountNumber: "999",
      accountType: "Cuenta Vista",
      taxId: "1-9",
      cbu: null,
      alias: null,
      swift: null,
      contactEmail: "a@b.cl",
      deadlineHours: 24,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const config = await getBankTransferConfig();
    expect(config?.bankName).toBe("Banco DB");
    expect(config?.accountNumber).toBe("999");
    expect(config?.deadlineHours).toBe(24);
    expect(await isBankTransferEnabled()).toBe(true);
  });

  it("usa env si no hay fila en DB", async () => {
    vi.stubEnv("BANK_NAME", "Banco Env");
    vi.stubEnv("BANK_ACCOUNT_HOLDER", "Env Holder");
    vi.stubEnv("BANK_ACCOUNT_NUMBER", "111");
    mockFindUnique.mockResolvedValue(null);

    const config = await getBankTransferConfig();
    expect(config?.bankName).toBe("Banco Env");
  });

  it("respeta BANK_TRANSFER_ENABLED=false aunque haya fila en DB", async () => {
    vi.stubEnv("BANK_TRANSFER_ENABLED", "false");
    mockFindUnique.mockResolvedValue({
      id: "default",
      enabled: true,
      bankName: "Banco DB",
      accountHolder: "Titular",
      accountNumber: "1",
      accountType: "Corriente",
      taxId: null,
      cbu: null,
      alias: null,
      swift: null,
      contactEmail: null,
      deadlineHours: 48,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(await getBankTransferConfig()).toBeNull();
  });
});
