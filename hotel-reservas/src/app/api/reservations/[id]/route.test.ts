import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { PaymentStatus, ReservationStatus } from "@prisma/client";

const { mockDb, mockSendPaid } = vi.hoisted(() => ({
  mockDb: {
    room: { findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    reservation: { findMany: vi.fn(), create: vi.fn(), updateMany: vi.fn(), count: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    roomBlock: { findMany: vi.fn(), count: vi.fn(), create: vi.fn(), delete: vi.fn() },
    guest: { upsert: vi.fn() },
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
  },
  mockSendPaid: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ default: mockDb }));
vi.mock("@/lib/email", () => ({
  sendReservationPaidEmail: mockSendPaid,
  buildReservationEmailPayload: vi.fn((r) => r),
}));

import { GET, PATCH } from "./route";

const params = { params: Promise.resolve({ id: "res-1" }) };

describe("/api/reservations/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Happy path: detalle de reserva.
  it("GET retorna reserva existente", async () => {
    mockDb.reservation.findUnique.mockResolvedValue({
      id: "res-1",
      confirmationCode: "ABC",
      pricePerNight: 100,
      totalAmount: 300,
      room: {},
      guest: {},
    });

    const response = await GET(new NextRequest("http://localhost"), params);
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.reservation.totalAmount).toBe(300);
  });

  // Edge case: reserva no encontrada.
  it("GET retorna 404 si no existe", async () => {
    mockDb.reservation.findUnique.mockResolvedValue(null);
    expect((await GET(new NextRequest("http://localhost"), params)).status).toBe(404);
  });

  // Happy path: admin marca como pagado.
  it("PATCH actualiza paymentStatus a PAID", async () => {
    mockDb.reservation.findUnique.mockResolvedValue({
      id: "res-1",
      paymentStatus: PaymentStatus.PENDING,
    });
    mockDb.reservation.update.mockResolvedValue({
      id: "res-1",
      paymentStatus: PaymentStatus.PAID,
      pricePerNight: 100,
      totalAmount: 300,
      room: { name: "Coihue" },
      guest: { email: "a@b.com", fullName: "Ana" },
      confirmationCode: "ABC",
      checkIn: new Date(),
      checkOut: new Date(),
      guestFullName: "Ana",
    });

    const request = new NextRequest("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ paymentStatus: "PAID" }),
    });

    const response = await PATCH(request, params);
    expect(response.status).toBe(200);
    expect(mockSendPaid).toHaveBeenCalled();
  });

  // Cancelar reserva pagada sin paymentStatus → REFUNDED automático.
  it("PATCH cancela reserva pagada asignando REFUNDED", async () => {
    mockDb.reservation.findUnique.mockResolvedValue({
      id: "res-1",
      paymentStatus: PaymentStatus.PAID,
    });
    mockDb.reservation.update.mockResolvedValue({
      id: "res-1",
      paymentStatus: PaymentStatus.REFUNDED,
      status: ReservationStatus.CANCELLED,
      pricePerNight: 100,
      totalAmount: 300,
      room: {},
      guest: {},
    });

    const request = new NextRequest("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ status: "CANCELLED" }),
    });

    const response = await PATCH(request, params);
    expect(response.status).toBe(200);
    expect(mockDb.reservation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          paymentStatus: PaymentStatus.REFUNDED,
          status: ReservationStatus.CANCELLED,
        }),
      })
    );
  });
});
