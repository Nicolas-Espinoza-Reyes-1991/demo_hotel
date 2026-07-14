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

import { GET } from "./route";

describe("GET /api/payments/config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    mockFindUnique.mockReset();
  });

  // Happy path: expone configuración de métodos de pago.
  it("retorna configuración de pagos", async () => {
    mockFindUnique.mockResolvedValue(null);
    vi.stubEnv("MERCADOPAGO_ACCESS_TOKEN", "");
    vi.stubEnv("NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY", "");
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("SMTP_HOST", "");
    vi.stubEnv("SMTP_FROM", "");
    vi.stubEnv("BANK_NAME", "Banco");
    vi.stubEnv("BANK_ACCOUNT_HOLDER", "Hotel");
    vi.stubEnv("BANK_ACCOUNT_NUMBER", "123");

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.currency).toBeDefined();
    expect(body.online).toBeDefined();
    expect(body.bankTransfer?.enabled).toBe(true);
    expect(body.notifications?.emailEnabled).toBe(false);
  });

  it("marca pago online como pronto cuando no está habilitado", async () => {
    mockFindUnique.mockResolvedValue(null);
    vi.stubEnv("MERCADOPAGO_ACCESS_TOKEN", "");
    vi.stubEnv("NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY", "");
    vi.stubEnv("ONLINE_PAYMENT_ENABLED", "");
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("BANK_NAME", "Banco");
    vi.stubEnv("BANK_ACCOUNT_HOLDER", "Hotel");
    vi.stubEnv("BANK_ACCOUNT_NUMBER", "123");

    const response = await GET();
    const body = await response.json();

    expect(body.online.enabled).toBe(false);
    expect(body.online.comingSoon).toBe(true);
    expect(body.online.label).toContain("Pronto");
  });

  it("habilita pago online cuando ONLINE_PAYMENT_ENABLED=true y hay demo", async () => {
    mockFindUnique.mockResolvedValue(null);
    vi.stubEnv("ONLINE_PAYMENT_ENABLED", "true");
    vi.stubEnv("ALLOW_SIMULATED_PAYMENT", "true");
    vi.stubEnv("MERCADOPAGO_ACCESS_TOKEN", "");
    vi.stubEnv("NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY", "");

    const response = await GET();
    const body = await response.json();

    expect(body.online.enabled).toBe(true);
    expect(body.online.comingSoon).toBe(false);
    expect(body.online.provider).toBe("simulated");
  });

  it("expone emailEnabled cuando SMTP está configurado", async () => {
    mockFindUnique.mockResolvedValue(null);
    vi.stubEnv("SMTP_HOST", "smtp.test.com");
    vi.stubEnv("SMTP_FROM", "Hotel <reservas@test.com>");

    const response = await GET();
    const body = await response.json();

    expect(body.notifications.emailEnabled).toBe(true);
  });
});
