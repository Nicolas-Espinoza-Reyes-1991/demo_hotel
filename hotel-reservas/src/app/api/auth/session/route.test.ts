import { describe, expect, it, vi } from "vitest";

const { mockGetSession, mockFindUnique } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockFindUnique: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getSession: mockGetSession }));
vi.mock("@/lib/prisma", () => ({
  default: {
    staffUser: {
      findUnique: mockFindUnique,
    },
  },
}));

import { GET } from "./route";

describe("GET /api/auth/session", () => {
  it("retorna datos frescos desde la BD cuando hay userId", async () => {
    mockGetSession.mockResolvedValue({ username: "admin", role: "ADMIN", userId: "u1" });
    mockFindUnique.mockResolvedValue({
      id: "u1",
      username: "nelson",
      role: "ADMIN",
      active: true,
      fullName: "Administrador",
    });

    const response = await GET();
    const body = await response.json();
    expect(body.authenticated).toBe(true);
    expect(body.username).toBe("nelson");
    expect(body.role).toBe("ADMIN");
    expect(body.fullName).toBe("Administrador");
  });

  it("retorna authenticated false sin cookie", async () => {
    mockGetSession.mockResolvedValue(null);
    const response = await GET();
    const body = await response.json();
    expect(body.authenticated).toBe(false);
    expect(body.username).toBeNull();
    expect(body.role).toBeNull();
  });
});
