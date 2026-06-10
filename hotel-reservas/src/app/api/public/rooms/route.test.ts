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

import { GET, OPTIONS } from "./route";

describe("/api/public/rooms", () => {
  beforeEach(() => {
    mockDb.room.findMany.mockReset();
  });

  // CORS preflight OPTIONS.
  it("OPTIONS responde 204 con headers CORS", async () => {
    const response = await OPTIONS();
    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  // Happy path: lista pública de habitaciones.
  it("GET retorna habitaciones con CORS", async () => {
    mockDb.room.findMany.mockResolvedValue([
      {
        id: "r1",
        code: "101",
        name: "Coihue",
        type: RoomType.STANDARD,
        pricePerNight: 100,
        maxGuests: 2,
        status: RoomStatus.AVAILABLE,
        beds: [],
        bathrooms: [],
        amenities: ["WiFi"],
      },
    ]);

    const response = await GET(new NextRequest("http://localhost/api/public/rooms"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.count).toBe(1);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  // Zod: filtro de tipo inválido.
  it("rechaza filtros inválidos", async () => {
    const response = await GET(new NextRequest("http://localhost/api/public/rooms?type=INVALID"));
    expect(response.status).toBe(400);
  });
});
