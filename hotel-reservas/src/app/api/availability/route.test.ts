import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { futureDateOnly } from "@/test/dates-fixtures";

vi.mock("@/lib/availability", () => ({
  findAvailableRooms: vi.fn().mockResolvedValue([
    { id: "r1", code: "101", nights: 3, totalAmount: 300 },
  ]),
}));

import { GET } from "./route";
import { findAvailableRooms } from "@/lib/availability";

describe("GET /api/availability", () => {
  // Happy path: devuelve habitaciones disponibles para fechas válidas.
  it("retorna habitaciones disponibles", async () => {
    const checkIn = futureDateOnly(5);
    const checkOut = futureDateOnly(8);
    const request = new NextRequest(
      `http://localhost/api/availability?checkIn=${checkIn}&checkOut=${checkOut}&guests=2`
    );

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.count).toBe(1);
    expect(body.nights).toBe(3);
    expect(findAvailableRooms).toHaveBeenCalled();
  });

  // Zod: parámetros inválidos retornan 400.
  it("rechaza parámetros inválidos", async () => {
    const request = new NextRequest("http://localhost/api/availability?checkIn=bad&checkOut=2026-01-02");
    const response = await GET(request);
    expect(response.status).toBe(400);
  });

  // Edge case: fechas invertidas.
  it("rechaza check-out anterior al check-in", async () => {
    const request = new NextRequest(
      `http://localhost/api/availability?checkIn=${futureDateOnly(10)}&checkOut=${futureDateOnly(5)}`
    );
    const response = await GET(request);
    expect(response.status).toBe(400);
  });
});
