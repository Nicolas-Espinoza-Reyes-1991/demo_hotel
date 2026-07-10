import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { PaymentStatus, ReservationStatus } from "@prisma/client";

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    reservation: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/prisma", () => ({
  default: mockDb,
}));

vi.mock("@/lib/availability", () => ({
  checkRoomAvailability: vi.fn(),
}));

import { GET } from "./route";

describe("GET /api/admin/alerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rechaza since inválido", async () => {
    const request = new NextRequest("http://localhost/api/admin/alerts");
    const response = await GET(request);
    expect(response.status).toBe(400);
  });

  it("lista reservas creadas después de since", async () => {
    const createdAt = new Date("2026-07-10T12:00:00.000Z");
    mockDb.reservation.findMany.mockResolvedValue([
      {
        id: "r1",
        confirmationCode: "ABC123",
        guestFullName: "Ana Pérez",
        checkIn: new Date("2026-08-01T00:00:00.000Z"),
        checkOut: new Date("2026-08-03T00:00:00.000Z"),
        paymentStatus: PaymentStatus.PENDING,
        status: ReservationStatus.CONFIRMED,
        totalAmount: 120000,
        createdAt,
        room: { code: "101", name: "Doble Lago" },
      },
    ]);

    const request = new NextRequest(
      "http://localhost/api/admin/alerts?since=2026-07-10T11:00:00.000Z"
    );
    const response = await GET(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.alerts).toHaveLength(1);
    expect(body.alerts[0].guestFullName).toBe("Ana Pérez");
    expect(body.alerts[0].roomCode).toBe("101");
    expect(body.alerts[0].totalAmount).toBe(120000);
    expect(mockDb.reservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: { gt: expect.any(Date) },
          status: { not: ReservationStatus.CANCELLED },
        }),
      })
    );
  });
});
