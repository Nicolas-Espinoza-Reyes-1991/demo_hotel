import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { RoomType } from "@prisma/client";

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    room: { findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    reservation: { findMany: vi.fn(), create: vi.fn(), updateMany: vi.fn(), count: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    roomBlock: { findMany: vi.fn(), count: vi.fn(), create: vi.fn(), delete: vi.fn() },
    guest: { upsert: vi.fn() },
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
  },
}));
vi.mock("@/lib/prisma", () => ({ default: mockDb }));

import { DELETE, PATCH } from "./route";

const params = { params: Promise.resolve({ id: "room-1" }) };

describe("/api/rooms/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Happy path: actualizar habitación.
  it("PATCH actualiza habitación existente", async () => {
    mockDb.room.findUnique.mockResolvedValue({ id: "room-1", code: "101" });
    mockDb.room.update.mockResolvedValue({
      id: "room-1",
      code: "101",
      name: "Nuevo nombre",
      type: RoomType.STANDARD,
      pricePerNight: 120,
      beds: [],
      bathrooms: [],
      amenities: [],
    });

    const request = new NextRequest("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ name: "Nuevo nombre", pricePerNight: 120 }),
    });

    const response = await PATCH(request, params);
    expect(response.status).toBe(200);
  });

  // Edge case: código duplicado.
  it("PATCH rechaza código duplicado", async () => {
    mockDb.room.findUnique
      .mockResolvedValueOnce({ id: "room-1", code: "101" })
      .mockResolvedValueOnce({ id: "room-2", code: "202" });

    const request = new NextRequest("http://localhost", {
      method: "PATCH",
      body: JSON.stringify({ code: "202" }),
    });

    const response = await PATCH(request, params);
    expect(response.status).toBe(409);
  });

  // Edge case: no eliminar habitación con reservas.
  it("DELETE rechaza habitación con reservas asociadas", async () => {
    mockDb.room.findUnique.mockResolvedValue({ id: "room-1", code: "101" });
    mockDb.reservation.count.mockResolvedValue(2);

    const response = await DELETE(new NextRequest("http://localhost"), params);
    const body = await response.json();
    expect(response.status).toBe(409);
    expect(body.code).toBe("HAS_RESERVATIONS");
  });

  // Happy path: eliminar habitación sin reservas.
  it("DELETE elimina habitación sin reservas", async () => {
    mockDb.room.findUnique.mockResolvedValue({ id: "room-1", code: "101" });
    mockDb.reservation.count.mockResolvedValue(0);
    mockDb.room.delete.mockResolvedValue({});

    const response = await DELETE(new NextRequest("http://localhost"), params);
    expect(response.status).toBe(200);
  });
});
