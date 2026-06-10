import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { RoomStatus, RoomType } from "@prisma/client";

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

import { GET, OPTIONS, POST } from "./route";

describe("/api/rooms", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // CORS OPTIONS.
  it("OPTIONS responde 204", async () => {
    expect((await OPTIONS()).status).toBe(204);
  });

  // Happy path: listado paginado.
  it("GET lista habitaciones con paginación", async () => {
    mockDb.room.count.mockResolvedValue(1);
    mockDb.room.findMany.mockResolvedValue([
      {
        id: "r1",
        code: "101",
        name: "Coihue",
        type: RoomType.STANDARD,
        pricePerNight: 100,
        beds: [],
        bathrooms: [],
        amenities: [],
      },
    ]);

    const response = await GET(new NextRequest("http://localhost/api/rooms?page=1"));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.total).toBe(1);
    expect(body.rooms[0].pricePerNight).toBe(100);
  });

  // Happy path: crear habitación admin.
  it("POST crea habitación válida", async () => {
    mockDb.room.create.mockResolvedValue({
      id: "new",
      code: "999",
      name: "Test",
      type: RoomType.STANDARD,
      pricePerNight: 50,
      beds: [],
      bathrooms: [],
      amenities: [],
    });

    const request = new NextRequest("http://localhost/api/rooms", {
      method: "POST",
      body: JSON.stringify({
        code: "999",
        name: "Test Room",
        type: "STANDARD",
        pricePerNight: 50,
        maxGuests: 2,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
  });

  // Zod: código inválido.
  it("POST rechaza código con caracteres inválidos", async () => {
    const request = new NextRequest("http://localhost/api/rooms", {
      method: "POST",
      body: JSON.stringify({
        code: "10 1",
        name: "Bad",
        type: "STANDARD",
        pricePerNight: 50,
        maxGuests: 2,
      }),
    });
    expect((await POST(request)).status).toBe(400);
  });
});
