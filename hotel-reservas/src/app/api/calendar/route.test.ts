import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/availability", () => ({
  getCalendarData: vi.fn().mockResolvedValue({
    year: 2026,
    month: 6,
    daysInMonth: 30,
    rooms: [],
    reservations: [],
    roomBlocks: [],
  }),
}));

import { GET } from "./route";

describe("GET /api/calendar", () => {
  // Happy path: datos de calendario admin.
  it("retorna datos del calendario para año y mes", async () => {
    const response = await GET(new NextRequest("http://localhost/api/calendar?year=2026&month=6"));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.month).toBe(6);
    expect(body.daysInMonth).toBe(30);
  });

  // Zod: mes inválido.
  it("rechaza mes fuera de rango", async () => {
    const response = await GET(new NextRequest("http://localhost/api/calendar?year=2026&month=13"));
    expect(response.status).toBe(400);
  });
});
