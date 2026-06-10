import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { PaymentStatus } from "@prisma/client";

const { mockDb, mockRateLimit, mockBankTransfer, mockMP, mockSimulated } = vi.hoisted(() => ({
  mockDb: {
    room: { findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    reservation: { findMany: vi.fn(), create: vi.fn(), updateMany: vi.fn(), count: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    roomBlock: { findMany: vi.fn(), count: vi.fn(), create: vi.fn(), delete: vi.fn() },
    guest: { upsert: vi.fn() },
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
  },
  mockRateLimit: vi.fn(() => ({ ok: true as const })),
  mockBankTransfer: vi.fn(),
  mockMP: vi.fn(),
  mockSimulated: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ default: mockDb }));
vi.mock("@/lib/rate-limit", () => ({
  getClientIp: vi.fn(() => "1.2.3.4"),
  rateLimit: mockRateLimit,
  rateLimitResponse: vi.fn(() => Response.json({ error: "limit" }, { status: 429 })),
}));
vi.mock("@/lib/mercadopago", () => ({
  isMercadoPagoConfigured: vi.fn().mockReturnValue(false),
  createMercadoPagoPayment: mockMP,
}));
vi.mock("@/lib/bank-transfer", () => ({
  processBankTransferPayment: mockBankTransfer,
}));
vi.mock("@/lib/payment", () => ({
  processSimulatedPayment: mockSimulated,
}));
vi.mock("@/lib/reservation-holds", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/reservation-holds")>();
  return { ...actual, isSimulatedPaymentAllowed: vi.fn().mockReturnValue(true) };
});

import { POST } from "./route";

const params = { params: Promise.resolve({ id: "res-1" }) };

describe("POST /api/reservations/[id]/pay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimit.mockReturnValue({ ok: true });
    mockSimulated.mockResolvedValue({
      success: true,
      transactionId: "TX-1",
      paymentStatus: PaymentStatus.PAID,
      message: "OK",
      provider: "SIMULATED",
    });
    mockDb.reservation.findUnique.mockResolvedValue({
      id: "res-1",
      pricePerNight: 100,
      totalAmount: 300,
      room: {},
      guest: {},
    });
  });

  // Happy path: pago simulado en demo.
  it("procesa pago simulado cuando MP no está configurado", async () => {
    const request = new NextRequest("http://localhost", {
      method: "POST",
      body: JSON.stringify({
        provider: "simulated",
        payment: {
          cardHolder: "Test",
          cardNumber: "4111111111111111",
          expiry: "12/30",
          cvv: "123",
        },
      }),
    });

    const response = await POST(request, params);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.provider).toBe("SIMULATED");
    expect(mockSimulated).toHaveBeenCalled();
  });

  // Happy path: transferencia bancaria.
  it("procesa transferencia bancaria", async () => {
    mockBankTransfer.mockResolvedValue({
      success: true,
      transactionId: "CONF-1",
      paymentStatus: PaymentStatus.PENDING,
      message: "Transferencia",
      provider: "BANK_TRANSFER",
    });

    const request = new NextRequest("http://localhost", {
      method: "POST",
      body: JSON.stringify({ provider: "bank_transfer" }),
    });

    const response = await POST(request, params);
    expect(response.status).toBe(200);
    expect(mockBankTransfer).toHaveBeenCalledWith("res-1");
  });

  // Zod: payload MP incompleto.
  it("rechaza payload Mercado Pago incompleto", async () => {
    const { isMercadoPagoConfigured } = await import("@/lib/mercadopago");
    vi.mocked(isMercadoPagoConfigured).mockReturnValue(true);

    const request = new NextRequest("http://localhost", {
      method: "POST",
      body: JSON.stringify({ provider: "mercadopago", formData: { token: "" } }),
    });

    expect((await POST(request, params)).status).toBe(400);
  });

  // Rate limit en pagos.
  it("responde 429 al superar rate limit", async () => {
    mockRateLimit.mockReturnValue({ ok: false, retryAfterSec: 30 });
    const request = new NextRequest("http://localhost", {
      method: "POST",
      body: JSON.stringify({ provider: "bank_transfer" }),
    });
    expect((await POST(request, params)).status).toBe(429);
  });
});
