import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { PaymentStatus, ReservationStatus, RoomStatus, RoomType } from "@prisma/client";
import { futureDateOnly } from "@/test/dates-fixtures";

const { mockDb, mockCheckRoomAvailability, mockRateLimit, mockExpireHolds, mockSendEmail, mockFindActiveGuestHold } =
  vi.hoisted(() => ({
  mockDb: {
    room: { findUnique: vi.fn(), findMany: vi.fn() },
    reservation: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), count: vi.fn() },
    roomBlock: { findMany: vi.fn() },
    guest: { upsert: vi.fn() },
    $transaction: vi.fn(),
  },
  mockCheckRoomAvailability: vi.fn(),
  mockRateLimit: vi.fn(() => ({ ok: true as const })),
  mockExpireHolds: vi.fn().mockResolvedValue(0),
  mockSendEmail: vi.fn().mockResolvedValue(undefined),
  mockFindActiveGuestHold: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: mockDb,
}));

vi.mock("@/lib/rate-limit", () => ({
  getClientIp: vi.fn(() => "203.0.113.1"),
  rateLimit: mockRateLimit,
  rateLimitResponse: vi.fn((retryAfterSec: number) =>
    Response.json(
      { error: "Demasiadas solicitudes." },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
    )
  ),
}));

vi.mock("@/lib/reservation-holds", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/reservation-holds")>();
  return {
    ...actual,
    expireStaleHoldReservations: mockExpireHolds,
    computeHoldExpiresAt: vi.fn(() => new Date(Date.now() + 30 * 60_000)),
    findActiveGuestHold: mockFindActiveGuestHold,
  };
});

vi.mock("@/lib/email", () => ({
  sendReservationCreatedEmail: mockSendEmail,
  buildReservationEmailPayload: vi.fn((r) => r),
}));

vi.mock("@/lib/availability", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/availability")>();
  return {
    ...actual,
    checkRoomAvailability: mockCheckRoomAvailability,
  };
});

import { GET, POST } from "./route";

const CHECK_IN = futureDateOnly(7);
const CHECK_OUT = futureDateOnly(10);

function jsonRequest(body: unknown, ip = "203.0.113.1") {
  return new NextRequest("http://localhost:3000/api/reservations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

function validReservationBody(overrides: Record<string, unknown> = {}) {
  return {
    roomId: "room-101",
    checkIn: CHECK_IN,
    checkOut: CHECK_OUT,
    guestsCount: 2,
    guest: {
      fullName: "Juan Pérez",
      email: "juan@example.com",
      phone: "+56 9 8765 4321",
      documentType: "RUT",
      rut: "12.345.678-5",
      birthDate: "1992-04-10",
    },
    ...overrides,
  };
}

describe("POST /api/reservations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimit.mockReturnValue({ ok: true });
    mockFindActiveGuestHold.mockResolvedValue(null);
    mockDb.$transaction.mockReset();
    mockDb.room.findUnique.mockReset();
    mockDb.guest.upsert.mockReset();
    mockDb.reservation.create.mockReset();
    mockDb.reservation.findUnique.mockReset();
    mockDb.reservation.findUnique.mockResolvedValue(null);
    mockDb.reservation.update.mockReset();
  });

  // Happy path: crea reserva con transacción Serializable y responde 201.
  it("crea reserva válida y responde 201", async () => {
    const room = {
      id: "room-101",
      code: "101",
      pricePerNight: 120,
      maxGuests: 4,
      status: RoomStatus.AVAILABLE,
      type: RoomType.STANDARD,
    };

    const created = {
      id: "res-new",
      confirmationCode: "CONF-001",
      roomId: "room-101",
      paymentStatus: PaymentStatus.PENDING,
      status: ReservationStatus.CONFIRMED,
      pricePerNight: 120,
      totalAmount: 360,
      room,
      guest: { id: "guest-1", email: "juan@example.com" },
    };

    mockDb.room.findUnique.mockResolvedValue(room);
    mockCheckRoomAvailability.mockResolvedValue({
      available: true,
      conflicts: [],
      nights: 3,
      totalAmount: 360,
    });
    mockDb.guest.upsert.mockResolvedValue({ id: "guest-1", email: "juan@example.com" });
    mockDb.reservation.create.mockResolvedValue(created);

    mockDb.$transaction.mockImplementation(async (callback, options) => {
      expect(options?.isolationLevel).toBe("Serializable");
      return callback(mockDb);
    });

    const response = await POST(jsonRequest(validReservationBody()));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.reservation.id).toBe("res-new");
    expect(mockExpireHolds).toHaveBeenCalled();
    expect(mockSendEmail).toHaveBeenCalled();
  });

  // Zod: payload inválido retorna 400 con detalles.
  it("rechaza payload inválido con 400", async () => {
    const response = await POST(
      jsonRequest({
        roomId: "",
        checkIn: "fecha-mala",
        checkOut: CHECK_OUT,
        guest: { fullName: "X", email: "bad" },
      })
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/inválidos/i);
    expect(mockDb.$transaction).not.toHaveBeenCalled();
  });

  // Edge case: rate limit excedido retorna 429.
  it("responde 429 cuando se supera el rate limit", async () => {
    mockRateLimit.mockReturnValue({ ok: false, retryAfterSec: 42 });

    const response = await POST(jsonRequest(validReservationBody()));

    expect(response.status).toBe(429);
    expect(mockDb.$transaction).not.toHaveBeenCalled();
  });

  // Reanuda hold pendiente del mismo huésped sin crear duplicado ni reenviar email.
  it("reanuda hold activo del mismo huésped y responde 200", async () => {
    const room = {
      id: "room-101",
      code: "101",
      pricePerNight: 120,
      maxGuests: 4,
      status: RoomStatus.AVAILABLE,
      type: RoomType.STANDARD,
    };

    const existingHold = {
      id: "res-hold",
      confirmationCode: "CONF-HOLD",
      roomId: "room-101",
      paymentStatus: PaymentStatus.PENDING,
      status: ReservationStatus.CONFIRMED,
      pricePerNight: 120,
      totalAmount: 360,
      room,
      guest: { id: "guest-1", email: "juan@example.com" },
    };

    const resumed = { ...existingHold, guestFullName: "Juan Pérez" };

    mockDb.room.findUnique.mockResolvedValue(room);
    mockFindActiveGuestHold.mockResolvedValue(existingHold);
    mockDb.guest.upsert.mockResolvedValue({ id: "guest-1", email: "juan@example.com" });
    mockDb.reservation.update.mockResolvedValue(resumed);

    mockDb.$transaction.mockImplementation(async (callback) => callback(mockDb));

    const response = await POST(jsonRequest(validReservationBody()));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.resumed).toBe(true);
    expect(body.reservation.id).toBe("res-hold");
    expect(mockDb.reservation.create).not.toHaveBeenCalled();
    expect(mockCheckRoomAvailability).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  // Anti double-booking: conflicto de disponibilidad retorna 409.
  it("responde 409 si la habitación no está disponible", async () => {
    mockDb.$transaction.mockImplementation(async (callback) => callback(mockDb));
    mockDb.room.findUnique.mockResolvedValue({
      id: "room-101",
      maxGuests: 4,
      pricePerNight: 100,
    });
    mockCheckRoomAvailability.mockResolvedValue({
      available: false,
      conflicts: [{ type: "RESERVATION", message: "Habitación no disponible: conflicto con reserva ABC." }],
      nights: 3,
      totalAmount: 300,
    });

    const response = await POST(jsonRequest(validReservationBody()));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.code).toBe("NOT_AVAILABLE");
    expect(body.error).toMatch(/no disponible/i);
  });

  // Edge case: huéspedes exceden maxGuests de la habitación.
  it("rechaza reserva si guestsCount supera maxGuests", async () => {
    mockDb.$transaction.mockImplementation(async (callback) => callback(mockDb));
    mockDb.room.findUnique.mockResolvedValue({
      id: "room-101",
      maxGuests: 2,
      pricePerNight: 100,
    });
    mockCheckRoomAvailability.mockResolvedValue({
      available: true,
      conflicts: [],
      nights: 3,
      totalAmount: 300,
    });

    const response = await POST(
      jsonRequest(validReservationBody({ guestsCount: 5 }))
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/máximo 2 huéspedes/i);
  });

  // Edge case: habitación inexistente dentro de la transacción.
  it("responde error si la habitación no existe en la transacción", async () => {
    mockDb.$transaction.mockImplementation(async (callback) => callback(mockDb));
    mockDb.room.findUnique.mockResolvedValue(null);

    const response = await POST(jsonRequest(validReservationBody()));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toMatch(/no encontrada/i);
  });
});

describe("GET /api/reservations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.reservation.count.mockReset();
    mockDb.reservation.findMany.mockReset();
  });

  // Happy path: listado admin con paginación (auth validada por middleware en runtime).
  it("lista reservas con paginación para admin", async () => {
    mockDb.reservation.count.mockResolvedValue(1);
    mockDb.reservation.findMany.mockResolvedValue([
      {
        id: "res-1",
        confirmationCode: "ABC",
        checkIn: new Date(`${CHECK_IN}T12:00:00.000Z`),
        checkOut: new Date(`${CHECK_OUT}T12:00:00.000Z`),
        pricePerNight: 100,
        totalAmount: 300,
        room: { code: "101", name: "Coihue", type: RoomType.STANDARD },
        guest: { fullName: "Juan", email: "juan@example.com", phone: null },
      },
    ]);

    const request = new NextRequest("http://localhost:3000/api/reservations?page=1&pageSize=10");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.total).toBe(1);
    expect(body.reservations).toHaveLength(1);
    expect(body.reservations[0].totalAmount).toBe(300);
  });

  // Zod: filtros de fecha inválidos (solo from sin to).
  it("rechaza filtros de fecha inconsistentes", async () => {
    const request = new NextRequest("http://localhost:3000/api/reservations?from=2026-06-01");
    const response = await GET(request);

    expect(response.status).toBe(400);
    expect(mockDb.reservation.findMany).not.toHaveBeenCalled();
  });
});
