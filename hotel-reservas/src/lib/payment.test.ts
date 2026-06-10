import { beforeEach, describe, expect, it, vi } from "vitest";
import { PaymentStatus, ReservationStatus } from "@prisma/client";
import { processSimulatedPayment } from "./payment";

const { mockDb, mockCheckAvailability } = vi.hoisted(() => ({
  mockDb: {
    room: { findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    reservation: { findMany: vi.fn(), create: vi.fn(), updateMany: vi.fn(), count: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    roomBlock: { findMany: vi.fn(), count: vi.fn(), create: vi.fn(), delete: vi.fn() },
    guest: { upsert: vi.fn() },
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
  },
  mockCheckAvailability: vi.fn(),
}));

vi.mock("./prisma", () => ({ default: mockDb }));
vi.mock("./availability", () => ({ checkRoomAvailability: mockCheckAvailability }));
vi.mock("./email", () => ({
  sendReservationPaidEmail: vi.fn(),
  buildReservationEmailPayload: vi.fn((r) => r),
}));

describe("processSimulatedPayment", () => {
  const baseReservation = {
    id: "res-1",
    confirmationCode: "CONF-ABC",
    roomId: "room-1",
    checkIn: new Date("2026-08-01T12:00:00.000Z"),
    checkOut: new Date("2026-08-03T12:00:00.000Z"),
    paymentStatus: PaymentStatus.PENDING,
    status: ReservationStatus.CONFIRMED,
    expiresAt: new Date(Date.now() + 60_000),
    paymentProvider: null,
    room: { name: "Coihue" },
    guest: { fullName: "Juan", email: "juan@example.com" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckAvailability.mockResolvedValue({
      available: true,
      conflicts: [],
      nights: 2,
      totalAmount: 200,
    });
  });

  // Happy path: pago simulado marca reserva como PAID.
  it("procesa pago simulado y actualiza reserva a PAID", async () => {
    mockDb.reservation.findUnique.mockResolvedValue(baseReservation);
    mockDb.reservation.update.mockResolvedValue({
      ...baseReservation,
      paymentStatus: PaymentStatus.PAID,
    });

    const result = await processSimulatedPayment("res-1", { cardLast4: "4242" });

    expect(result.success).toBe(true);
    expect(result.paymentStatus).toBe(PaymentStatus.PAID);
    expect(result.provider).toBe("SIMULATED");
    expect(mockDb.reservation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          paymentStatus: PaymentStatus.PAID,
          expiresAt: null,
        }),
      })
    );
  });

  // Edge case: reserva ya pagada retorna éxito idempotente.
  it("retorna éxito si la reserva ya estaba pagada", async () => {
    mockDb.reservation.findUnique.mockResolvedValue({
      ...baseReservation,
      paymentStatus: PaymentStatus.PAID,
    });

    const result = await processSimulatedPayment("res-1");
    expect(result.paymentStatus).toBe(PaymentStatus.PAID);
    expect(mockDb.reservation.update).not.toHaveBeenCalled();
  });

  // Hold expirado impide pagar.
  it("lanza error si el hold de pago expiró", async () => {
    mockDb.reservation.findUnique.mockResolvedValue({
      ...baseReservation,
      expiresAt: new Date(Date.now() - 1_000),
    });

    await expect(processSimulatedPayment("res-1")).rejects.toThrow(/tiempo para completar el pago/i);
  });

  // Anti double-booking: habitación no disponible al pagar.
  it("lanza error si la habitación ya no está disponible", async () => {
    mockDb.reservation.findUnique.mockResolvedValue(baseReservation);
    mockCheckAvailability.mockResolvedValue({
      available: false,
      conflicts: [{ type: "RESERVATION", message: "Habitación no disponible." }],
      nights: 2,
      totalAmount: 200,
    });

    await expect(processSimulatedPayment("res-1")).rejects.toThrow(/no disponible/i);
  });

  // Edge case: reserva inexistente.
  it("lanza error si la reserva no existe", async () => {
    mockDb.reservation.findUnique.mockResolvedValue(null);
    await expect(processSimulatedPayment("missing")).rejects.toThrow(/no encontrada/i);
  });
});
