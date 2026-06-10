import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { futureDateOnly } from "@/test/dates-fixtures";

vi.mock("@/lib/availability", () => ({
  checkRoomAvailability: vi.fn().mockResolvedValue({
    available: true,
    conflicts: [],
    nights: 2,
    totalAmount: 200,
  }),
}));

import { POST } from "./route";
import { checkRoomAvailability } from "@/lib/availability";

const params = { params: Promise.resolve({ id: "res-1" }) };

describe("POST /api/reservations/[id]/validate", () => {
  // Happy path: revalida disponibilidad excluyendo la reserva actual.
  it("revalida fechas y excluye la reserva en edición", async () => {
    const checkIn = futureDateOnly(10);
    const checkOut = futureDateOnly(12);
    const request = new NextRequest("http://localhost", {
      method: "POST",
      body: JSON.stringify({ roomId: "room-1", checkIn, checkOut }),
    });

    const response = await POST(request, params);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.available).toBe(true);
    expect(checkRoomAvailability).toHaveBeenCalledWith(
      "room-1",
      expect.any(Date),
      expect.any(Date),
      "res-1"
    );
  });

  // Zod: fechas invertidas.
  it("rechaza fechas invertidas", async () => {
    const request = new NextRequest("http://localhost", {
      method: "POST",
      body: JSON.stringify({
        roomId: "room-1",
        checkIn: futureDateOnly(12),
        checkOut: futureDateOnly(10),
      }),
    });
    expect((await POST(request, params)).status).toBe(400);
  });
});
