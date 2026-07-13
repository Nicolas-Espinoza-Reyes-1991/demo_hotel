import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    room: { findMany: vi.fn() },
    reservation: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/prisma", () => ({
  default: mockPrisma,
}));

import { GET } from "./route";

describe("GET /api/admin/reports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.room.findMany.mockResolvedValue([
      { id: "r1", code: "101", name: "Coihue" },
    ]);
    mockPrisma.reservation.findMany.mockResolvedValue([]);
  });

  it("retorna reporte del período", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/admin/reports?from=2026-07-01&to=2026-07-31")
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.from).toBe("2026-07-01");
    expect(body.to).toBe("2026-07-31");
    expect(body.summary).toBeDefined();
    expect(body.roomCount).toBe(1);
  });

  it("rechaza rango invertido", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/admin/reports?from=2026-08-01&to=2026-07-01")
    );
    expect(response.status).toBe(400);
  });
});
