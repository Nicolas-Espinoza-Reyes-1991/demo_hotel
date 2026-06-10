import { beforeEach, describe, expect, it, vi } from "vitest";

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

import { GET } from "./route";

describe("GET /api/health", () => {
  beforeEach(() => {
    mockDb.$queryRaw.mockReset();
  });

  // Happy path: DB responde SELECT 1.
  it("retorna ok cuando la base de datos responde", async () => {
    mockDb.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);
    const response = await GET();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
  });

  // Edge case: fallo de DB retorna 503.
  it("retorna 503 si la base de datos falla", async () => {
    mockDb.$queryRaw.mockRejectedValue(new Error("connection refused"));
    const response = await GET();
    expect(response.status).toBe(503);
  });
});
