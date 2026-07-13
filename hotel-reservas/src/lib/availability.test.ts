import { beforeEach, describe, expect, it, vi } from "vitest";
import { PaymentStatus, RoomStatus, RoomType } from "@prisma/client";
import {
  checkRoomAvailability,
  dateRangesOverlap,
  findAvailableRooms,
  OCCUPYING_RESERVATION_STATUSES,
} from "./availability";
import {
  computeHoldExpiresAt,
  getReservationHoldMinutes,
  isReservationHoldExpired,
} from "./reservation-holds";
import { ReservationStatus } from "@prisma/client";
import { createMockDb } from "@/test/prisma-mock";
import { futureDateOnly, utcNoon } from "@/test/dates-fixtures";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    room: { findUnique: vi.fn(), findMany: vi.fn() },
    reservation: { findMany: vi.fn(), create: vi.fn(), updateMany: vi.fn(), count: vi.fn() },
    roomBlock: { findMany: vi.fn() },
    roomPriceRule: { findMany: vi.fn() },
    guest: { upsert: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("./prisma", () => ({
  default: mockPrisma,
}));

vi.mock("./reservation-holds", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./reservation-holds")>();
  return {
    ...actual,
    expireStaleHoldReservations: vi.fn().mockResolvedValue(0),
  };
});

import { expireStaleHoldReservations } from "./reservation-holds";

const CHECK_IN = futureDateOnly(5);
const CHECK_OUT = futureDateOnly(8);

function baseRoom(overrides: Record<string, unknown> = {}) {
  return {
    id: "room-101",
    code: "101",
    name: "Coihue",
    type: RoomType.STANDARD,
    pricePerNight: 100,
    maxGuests: 2,
    status: RoomStatus.AVAILABLE,
    ...overrides,
  };
}

describe("dateRangesOverlap", () => {
  // Evalúa solapamiento parcial entre dos rangos [inicio, fin).
  it("detecta solapamiento parcial entre rangos", () => {
    expect(
      dateRangesOverlap(
        utcNoon("2026-06-10"),
        utcNoon("2026-06-15"),
        utcNoon("2026-06-12"),
        utcNoon("2026-06-18")
      )
    ).toBe(true);
  });

  // Confirma que rangos contiguos sin día compartido no se consideran solapados.
  it("no solapa cuando un rango termina donde empieza el otro", () => {
    expect(
      dateRangesOverlap(
        utcNoon("2026-06-10"),
        utcNoon("2026-06-12"),
        utcNoon("2026-06-12"),
        utcNoon("2026-06-14")
      )
    ).toBe(false);
  });

  // Verifica inclusión total: un rango contenido dentro de otro cuenta como conflicto.
  it("detecta cuando un rango está completamente dentro de otro", () => {
    expect(
      dateRangesOverlap(
        utcNoon("2026-06-01"),
        utcNoon("2026-06-30"),
        utcNoon("2026-06-10"),
        utcNoon("2026-06-12")
      )
    ).toBe(true);
  });

  // Asegura que rangos idénticos generan solapamiento (double-booking).
  it("detecta solapamiento con rangos idénticos", () => {
    expect(
      dateRangesOverlap(
        utcNoon("2026-06-10"),
        utcNoon("2026-06-15"),
        utcNoon("2026-06-10"),
        utcNoon("2026-06-15")
      )
    ).toBe(true);
  });
});

describe("checkRoomAvailability", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    db.reservation.findMany.mockResolvedValue([]);
    db.roomBlock.findMany.mockResolvedValue([]);
    db.roomPriceRule.findMany.mockResolvedValue([]);
  });

  // Happy path: habitación disponible sin reservas ni bloqueos activos.
  it("retorna disponible con noches y total calculados", async () => {
    db.room.findUnique.mockResolvedValue(baseRoom());

    const result = await checkRoomAvailability("room-101", CHECK_IN, CHECK_OUT, undefined, db);

    expect(result.available).toBe(true);
    expect(result.conflicts).toHaveLength(0);
    expect(result.nights).toBe(3);
    expect(result.totalAmount).toBe(300);
    expect(result.averagePricePerNight).toBe(100);
  });

  it("calcula total con tarifa de temporada", async () => {
    db.room.findUnique.mockResolvedValue(baseRoom({ pricePerNight: 100 }));
    db.roomPriceRule.findMany.mockResolvedValue([
      {
        id: "rule-1",
        roomId: "room-101",
        startDate: new Date(`${CHECK_IN}T12:00:00.000Z`),
        endDate: new Date(`${CHECK_OUT}T12:00:00.000Z`),
        pricePerNight: 250,
        name: "Alta",
        createdAt: new Date("2026-01-01"),
      },
    ]);

    const result = await checkRoomAvailability("room-101", CHECK_IN, CHECK_OUT, undefined, db);

    expect(result.available).toBe(true);
    expect(result.totalAmount).toBe(750);
    expect(result.averagePricePerNight).toBe(250);
  });

  // Edge case: check-out anterior o igual al check-in debe rechazarse.
  it("rechaza fechas invertidas (check-out antes o igual al check-in)", async () => {
    const result = await checkRoomAvailability("room-101", CHECK_OUT, CHECK_IN, undefined, db);

    expect(result.available).toBe(false);
    expect(result.nights).toBe(0);
    expect(result.conflicts[0]?.message).toMatch(/posterior al check-in/i);
    expect(db.room.findUnique).not.toHaveBeenCalled();
  });

  // Edge case: ID de habitación inexistente.
  it("marca no disponible si la habitación no existe", async () => {
    db.room.findUnique.mockResolvedValue(null);

    const result = await checkRoomAvailability("missing-id", CHECK_IN, CHECK_OUT, undefined, db);

    expect(result.available).toBe(false);
    expect(result.conflicts[0]?.type).toBe("ROOM_STATUS");
    expect(result.conflicts[0]?.message).toMatch(/no encontrada/i);
  });

  // Regla de negocio: RoomStatus MAINTENANCE bloquea la habitación.
  it("rechaza habitación en mantenimiento", async () => {
    db.room.findUnique.mockResolvedValue(baseRoom({ status: RoomStatus.MAINTENANCE }));

    const result = await checkRoomAvailability("room-101", CHECK_IN, CHECK_OUT, undefined, db);

    expect(result.available).toBe(false);
    expect(result.conflicts.some((c) => c.message.includes("mantenimiento"))).toBe(true);
  });

  // Regla de negocio: RoomStatus BLOCKED impide reservas.
  it("rechaza habitación bloqueada administrativamente", async () => {
    db.room.findUnique.mockResolvedValue(baseRoom({ status: RoomStatus.BLOCKED }));

    const result = await checkRoomAvailability("room-101", CHECK_IN, CHECK_OUT, undefined, db);

    expect(result.available).toBe(false);
    expect(result.conflicts.some((c) => c.message.includes("bloqueada"))).toBe(true);
  });

  // Anti double-booking: reserva pagada solapada genera conflicto RESERVATION.
  it("detecta conflicto con reserva pagada solapada", async () => {
    db.room.findUnique.mockResolvedValue(baseRoom());
    db.reservation.findMany.mockResolvedValue([
      {
        id: "res-existing",
        guestFullName: "María González",
        paymentStatus: PaymentStatus.PAID,
        checkIn: utcNoon(futureDateOnly(6)),
        checkOut: utcNoon(futureDateOnly(9)),
      },
    ]);

    const result = await checkRoomAvailability("room-101", CHECK_IN, CHECK_OUT, undefined, db);

    expect(result.available).toBe(false);
    expect(result.conflicts[0]?.type).toBe("RESERVATION");
    expect(result.conflicts[0]?.reservationId).toBe("res-existing");
    expect(result.conflicts[0]?.message).toMatch(/María González/i);
    expect(result.conflicts[0]?.message).toMatch(/habitación 101/i);
    expect(result.conflicts[0]?.message).not.toMatch(/cmq88/i);
  });

  // Holds: la query de Prisma excluye holds expirados; simulamos lista vacía = disponible.
  it("ignora holds expirados (no devueltos por la consulta de solapamiento)", async () => {
    db.room.findUnique.mockResolvedValue(baseRoom());
    db.reservation.findMany.mockResolvedValue([]);

    const result = await checkRoomAvailability("room-101", CHECK_IN, CHECK_OUT, undefined, db);

    expect(result.available).toBe(true);
    expect(db.reservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { in: OCCUPYING_RESERVATION_STATUSES },
          OR: expect.arrayContaining([
            { paymentStatus: PaymentStatus.PAID },
            { paymentStatus: PaymentStatus.PENDING, expiresAt: null },
            { paymentStatus: PaymentStatus.PENDING, expiresAt: { gt: expect.any(Date) } },
          ]),
        }),
      })
    );
  });

  // Edge case: bloqueo administrativo (RoomBlock) en el mismo rango.
  it("detecta conflicto con bloqueo de habitación (RoomBlock)", async () => {
    db.room.findUnique.mockResolvedValue(baseRoom());
    db.roomBlock.findMany.mockResolvedValue([
      {
        id: "block-1",
        reason: "Mantenimiento programado",
        startDate: utcNoon(futureDateOnly(4)),
        endDate: utcNoon(futureDateOnly(10)),
      },
    ]);

    const result = await checkRoomAvailability("room-101", CHECK_IN, CHECK_OUT, undefined, db);

    expect(result.available).toBe(false);
    expect(result.conflicts[0]?.type).toBe("ROOM_BLOCK");
    expect(result.conflicts[0]?.message).toMatch(/Mantenimiento programado/i);
    expect(result.conflicts[0]?.message).toMatch(/habitación 101/i);
  });

  // Edición de reserva: excludeReservationId evita autoconflicto.
  it("excluye la reserva actual al revalidar con excludeReservationId", async () => {
    db.room.findUnique.mockResolvedValue(baseRoom());

    await checkRoomAvailability("room-101", CHECK_IN, CHECK_OUT, "res-self", db);

    expect(db.reservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { not: "res-self" },
        }),
      })
    );
  });

  // Zona horaria: fechas YYYY-MM-DD se normalizan a mediodía UTC sin desfase.
  it("calcula noches correctamente con strings YYYY-MM-DD (UTC)", async () => {
    db.room.findUnique.mockResolvedValue(baseRoom({ pricePerNight: 50 }));

    const result = await checkRoomAvailability(
      "room-101",
      "2026-12-01",
      "2026-12-04",
      undefined,
      db
    );

    expect(result.nights).toBe(3);
    expect(result.totalAmount).toBe(150);
  });
});

describe("findAvailableRooms", () => {
  beforeEach(() => {
    mockPrisma.room.findMany.mockReset();
    mockPrisma.room.findUnique.mockReset();
    mockPrisma.reservation.findMany.mockReset();
    mockPrisma.roomBlock.findMany.mockReset();
    mockPrisma.roomPriceRule.findMany.mockReset();
    mockPrisma.roomPriceRule.findMany.mockResolvedValue([]);
    mockPrisma.roomBlock.findMany.mockResolvedValue([]);
    mockPrisma.reservation.findMany.mockResolvedValue([]);
    vi.mocked(expireStaleHoldReservations).mockClear();
  });

  // Happy path: filtra habitaciones que pasan checkRoomAvailability.
  it("devuelve solo habitaciones disponibles para el rango y huéspedes", async () => {
    const availableRoom = {
      ...baseRoom({ id: "room-a", code: "A", pricePerNight: 100 }),
      beds: [],
      bathrooms: [],
      amenities: ["WiFi"],
      floor: 1,
    };

    const blockedRoom = {
      ...baseRoom({ id: "room-b", code: "B", status: RoomStatus.AVAILABLE }),
      beds: [],
      bathrooms: [],
      amenities: [],
      floor: 1,
    };

    mockPrisma.room.findMany.mockResolvedValue([availableRoom, blockedRoom]);
    mockPrisma.room.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) => {
      if (where.id === "room-a") return availableRoom;
      if (where.id === "room-b") return blockedRoom;
      return null;
    });
    mockPrisma.reservation.findMany.mockImplementation(async ({ where }: { where: { roomId: string } }) => {
      if (where.roomId === "room-b") {
        return [
          {
            id: "res-block",
            confirmationCode: "BLOCKED",
            checkIn: utcNoon(futureDateOnly(9)),
            checkOut: utcNoon(futureDateOnly(13)),
          },
        ];
      }
      return [];
    });
    mockPrisma.roomBlock.findMany.mockResolvedValue([]);

    const rooms = await findAvailableRooms({
      checkIn: futureDateOnly(10),
      checkOut: futureDateOnly(12),
      guests: 2,
    });

    expect(expireStaleHoldReservations).toHaveBeenCalled();
    expect(rooms).toHaveLength(1);
    expect(rooms[0]?.code).toBe("A");
    expect(rooms[0]?.nights).toBe(2);
    expect(rooms[0]?.totalAmount).toBe(200);
  });
});

describe("reservation holds", () => {
  // Configuración por defecto de hold temporal (30 min).
  it("calcula minutos de hold desde env default", () => {
    expect(getReservationHoldMinutes()).toBeGreaterThan(0);
  });

  // Hold vencido: reserva PENDING con expiresAt pasado se considera expirada.
  it("expira holds pendientes vencidos", () => {
    expect(
      isReservationHoldExpired({
        paymentStatus: PaymentStatus.PENDING,
        status: ReservationStatus.CONFIRMED,
        expiresAt: new Date(Date.now() - 60_000),
      })
    ).toBe(true);
  });

  // Hold activo: expiresAt futuro mantiene la reserva como pagable.
  it("mantiene hold activo si expiresAt es futuro", () => {
    expect(
      isReservationHoldExpired({
        paymentStatus: PaymentStatus.PENDING,
        status: ReservationStatus.CONFIRMED,
        expiresAt: new Date(Date.now() + 60_000),
      })
    ).toBe(false);
  });

  // Generación de expiresAt según minutos configurados.
  it("genera fecha de expiración futura", () => {
    const expiresAt = computeHoldExpiresAt(30);
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});
