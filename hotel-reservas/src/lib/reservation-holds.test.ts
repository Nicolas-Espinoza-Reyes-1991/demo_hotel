import { afterEach, describe, expect, it, vi } from "vitest";
import { PaymentStatus, ReservationStatus } from "@prisma/client";
import {
  assertReservationPayable,
  computeBankTransferExpiresAt,
  computeHoldExpiresAt,
  expireStaleHoldReservations,
  getReservationHoldMinutes,
  isReservationHoldExpired,
  isSimulatedPaymentAllowed,
} from "./reservation-holds";

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    room: { findUnique: vi.fn(), findMany: vi.fn() },
    reservation: { findMany: vi.fn(), create: vi.fn(), updateMany: vi.fn(), count: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    roomBlock: { findMany: vi.fn(), count: vi.fn(), create: vi.fn(), delete: vi.fn() },
    guest: { upsert: vi.fn() },
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
  },
}));

vi.mock("./prisma", () => ({ default: mockDb }));

describe("reservation-holds", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  // Config default de minutos de hold.
  it("getReservationHoldMinutes usa 30 por defecto", () => {
    vi.stubEnv("RESERVATION_HOLD_MINUTES", "");
    expect(getReservationHoldMinutes()).toBe(30);
  });

  // Hold activo: expiresAt futuro no está expirado.
  it("isReservationHoldExpired es false con expiresAt futuro", () => {
    expect(
      isReservationHoldExpired({
        paymentStatus: PaymentStatus.PENDING,
        status: ReservationStatus.CONFIRMED,
        expiresAt: new Date(Date.now() + 60_000),
      })
    ).toBe(false);
  });

  // Hold vencido lanza al intentar pagar.
  it("assertReservationPayable lanza si el hold expiró", () => {
    expect(() =>
      assertReservationPayable({
        paymentStatus: PaymentStatus.PENDING,
        status: ReservationStatus.CONFIRMED,
        expiresAt: new Date(Date.now() - 1_000),
      })
    ).toThrow(/tiempo para completar el pago/i);
  });

  // expireStaleHoldReservations cancela reservas vencidas.
  it("expireStaleHoldReservations actualiza reservas expiradas", async () => {
    mockDb.reservation.updateMany.mockResolvedValue({ count: 2 });
    const count = await expireStaleHoldReservations(mockDb);
    expect(count).toBe(2);
    expect(mockDb.reservation.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          paymentStatus: PaymentStatus.PENDING,
          expiresAt: { lt: expect.any(Date) },
        }),
      })
    );
  });

  // computeHoldExpiresAt genera fecha futura.
  it("computeHoldExpiresAt suma minutos al momento actual", () => {
    const expires = computeHoldExpiresAt(15);
    expect(expires.getTime()).toBeGreaterThan(Date.now());
  });

  // Transferencia bancaria: plazo en horas.
  it("computeBankTransferExpiresAt respeta deadline en horas", () => {
    const before = Date.now();
    const expires = computeBankTransferExpiresAt(48);
    expect(expires.getTime()).toBeGreaterThan(before + 47 * 60 * 60_000);
  });

  // Pago simulado deshabilitado en producción por defecto.
  it("isSimulatedPaymentAllowed es false en production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ALLOW_SIMULATED_PAYMENT", "");
    expect(isSimulatedPaymentAllowed()).toBe(false);
  });
});
