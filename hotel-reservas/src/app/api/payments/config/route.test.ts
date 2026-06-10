import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

describe("GET /api/payments/config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // Happy path: expone configuración de métodos de pago.
  it("retorna configuración de pagos", async () => {
    vi.stubEnv("MERCADOPAGO_ACCESS_TOKEN", "");
    vi.stubEnv("NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY", "");
    vi.stubEnv("NODE_ENV", "development");
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

  it("expone emailEnabled cuando SMTP está configurado", async () => {
    vi.stubEnv("SMTP_HOST", "smtp.test.com");
    vi.stubEnv("SMTP_FROM", "Hotel <reservas@test.com>");

    const response = await GET();
    const body = await response.json();

    expect(body.notifications.emailEnabled).toBe(true);
  });
});
