import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    roomPriceRule: {
      count: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    room: { findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  default: mockPrisma,
}));

import { GET, POST } from "./route";
import { DELETE } from "./[id]/route";

describe("GET /api/room-price-rules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lista tarifas paginadas", async () => {
    mockPrisma.roomPriceRule.count.mockResolvedValue(1);
    mockPrisma.roomPriceRule.findMany.mockResolvedValue([
      {
        id: "rule-1",
        roomId: "room-1",
        startDate: new Date("2026-12-15T12:00:00.000Z"),
        endDate: new Date("2027-03-15T12:00:00.000Z"),
        pricePerNight: 85000,
        name: "Verano",
        room: { code: "101", name: "Coihue" },
      },
    ]);

    const response = await GET(new NextRequest("http://localhost/api/room-price-rules?page=1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.total).toBe(1);
    expect(body.rules[0].pricePerNight).toBe(85000);
    expect(body.rules[0].startDate).toBe("2026-12-15");
  });
});

describe("POST /api/room-price-rules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("crea tarifas por cabaña", async () => {
    mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockPrisma) => unknown) =>
      cb(mockPrisma)
    );
    mockPrisma.room.findMany.mockResolvedValue([{ id: "room-1", code: "101", name: "Coihue" }]);
    mockPrisma.roomPriceRule.findMany.mockResolvedValue([]);
    mockPrisma.roomPriceRule.create.mockResolvedValue({
      id: "rule-1",
      roomId: "room-1",
      startDate: new Date("2026-12-15T12:00:00.000Z"),
      endDate: new Date("2027-03-15T12:00:00.000Z"),
      pricePerNight: 90000,
      name: "Verano",
      room: { code: "101", name: "Coihue" },
    });

    const response = await POST(
      new NextRequest("http://localhost/api/room-price-rules", {
        method: "POST",
        body: JSON.stringify({
          name: "Verano",
          startDate: "2026-12-15",
          endDate: "2027-03-15",
          items: [{ roomId: "room-1", pricePerNight: 90000 }],
        }),
        headers: { "Content-Type": "application/json" },
      })
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.count).toBe(1);
    expect(body.rules[0].roomCode).toBe("101");
  });

  it("rechaza solape de tarifas", async () => {
    mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockPrisma) => unknown) =>
      cb(mockPrisma)
    );
    mockPrisma.room.findMany.mockResolvedValue([{ id: "room-1", code: "101", name: "Coihue" }]);
    mockPrisma.roomPriceRule.findMany.mockResolvedValue([
      {
        id: "existing",
        roomId: "room-1",
        startDate: new Date("2026-12-01T12:00:00.000Z"),
        endDate: new Date("2027-01-01T12:00:00.000Z"),
        pricePerNight: 80000,
        name: "Alta",
        room: { code: "101" },
      },
    ]);

    const response = await POST(
      new NextRequest("http://localhost/api/room-price-rules", {
        method: "POST",
        body: JSON.stringify({
          startDate: "2026-12-15",
          endDate: "2027-03-15",
          items: [{ roomId: "room-1", pricePerNight: 90000 }],
        }),
        headers: { "Content-Type": "application/json" },
      })
    );

    expect(response.status).toBe(409);
  });
});

describe("DELETE /api/room-price-rules/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("elimina una tarifa", async () => {
    mockPrisma.roomPriceRule.findUnique.mockResolvedValue({ id: "rule-1" });
    mockPrisma.roomPriceRule.delete.mockResolvedValue({ id: "rule-1" });

    const response = await DELETE(new Request("http://localhost/api/room-price-rules/rule-1"), {
      params: Promise.resolve({ id: "rule-1" }),
    });

    expect(response.status).toBe(200);
  });
});
