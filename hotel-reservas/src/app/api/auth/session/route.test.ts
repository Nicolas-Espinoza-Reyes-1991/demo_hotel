import { describe, expect, it, vi } from "vitest";

const { mockGetSession } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getSession: mockGetSession }));

import { GET } from "./route";

describe("GET /api/auth/session", () => {
  // Happy path: sesión activa.
  it("retorna authenticated true con username", async () => {
    mockGetSession.mockResolvedValue({ username: "admin", role: "admin" });
    const response = await GET();
    const body = await response.json();
    expect(body.authenticated).toBe(true);
    expect(body.username).toBe("admin");
  });

  // Sin sesión.
  it("retorna authenticated false sin cookie", async () => {
    mockGetSession.mockResolvedValue(null);
    const response = await GET();
    const body = await response.json();
    expect(body.authenticated).toBe(false);
    expect(body.username).toBeNull();
  });
});
