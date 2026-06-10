import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { futureDateOnly } from "@/test/dates-fixtures";

const { mockDb, mockCheckAvailability } = vi.hoisted(() => ({
  mockDb: {
    roomBlock: { count: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    room: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
  mockCheckAvailability: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ default: mockDb }));
vi.mock("@/lib/availability", () => ({ checkRoomAvailability: mockCheckAvailability }));

import { GET, POST } from "./route";

describe("/api/room-blocks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Happy path: listado de bloqueos.
  it("GET lista bloqueos paginados", async () => {
    mockDb.roomBlock.count.mockResolvedValue(1);
    mockDb.roomBlock.findMany.mockResolvedValue([
      {
        id: "b1",
        roomId: "r1",
        startDate: new Date(`${futureDateOnly(5)}T12:00:00.000Z`),
        endDate: new Date(`${futureDateOnly(10)}T12:00:00.000Z`),
        reason: "Mantenimiento",
        room: { code: "101", name: "Coihue" },
      },
    ]);

    const response = await GET(new NextRequest("http://localhost/api/room-blocks"));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.total).toBe(1);
  });

  // Happy path: crear bloqueo con transacción Serializable.
  it("POST crea bloqueo cuando no hay conflictos", async () => {
    const block = {
      id: "b-new",
      roomId: "r1",
      startDate: new Date(`${futureDateOnly(5)}T12:00:00.000Z`),
      endDate: new Date(`${futureDateOnly(8)}T12:00:00.000Z`),
      reason: "Evento",
      room: { code: "101", name: "Coihue" },
    };

    mockDb.$transaction.mockImplementation(async (callback, options) => {
      expect(options?.isolationLevel).toBe("Serializable");
      mockDb.room.findUnique.mockResolvedValue({ id: "r1" });
      mockCheckAvailability.mockResolvedValue({ available: true, conflicts: [], nights: 3, totalAmount: 0 });
      mockDb.roomBlock.create.mockResolvedValue(block);
      return callback(mockDb);
    });

    const request = new NextRequest("http://localhost/api/room-blocks", {
      method: "POST",
      body: JSON.stringify({
        roomId: "r1",
        startDate: futureDateOnly(5),
        endDate: futureDateOnly(8),
        reason: "Evento",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
  });

  // Edge case: fechas invertidas.
  it("POST rechaza fechas invertidas", async () => {
    const request = new NextRequest("http://localhost/api/room-blocks", {
      method: "POST",
      body: JSON.stringify({
        roomId: "r1",
        startDate: futureDateOnly(10),
        endDate: futureDateOnly(5),
      }),
    });
    expect((await POST(request)).status).toBe(400);
  });
});
