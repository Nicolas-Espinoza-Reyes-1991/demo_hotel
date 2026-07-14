import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockRequireAdmin, mockList } = vi.hoisted(() => ({
  mockRequireAdmin: vi.fn(),
  mockList: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireAdminSession: mockRequireAdmin,
}));

vi.mock("@/lib/admin-audit", () => ({
  listAdminAuditLogs: mockList,
}));

import { GET } from "./route";

describe("GET /api/admin/audit-logs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ username: "admin", role: "ADMIN", userId: "u1" });
    mockList.mockResolvedValue([
      {
        id: "1",
        action: "user.password_change",
        actorName: "admin",
        summary: "admin cambió la contraseña de recepcion",
        createdAt: "2026-07-14T12:00:00.000Z",
      },
    ]);
  });

  it("lista logs para ADMIN", async () => {
    const request = new NextRequest(
      "http://localhost/api/admin/audit-logs?action=user.password_change&limit=10"
    );
    const response = await GET(request);
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.logs).toHaveLength(1);
    expect(mockList).toHaveBeenCalledWith({
      action: "user.password_change",
      limit: 10,
    });
  });

  it("exige ADMIN", async () => {
    const { AppError } = await import("@/lib/api-response");
    mockRequireAdmin.mockRejectedValue(
      new AppError("Solo el administrador puede realizar esta acción.", 403, "FORBIDDEN")
    );
    const request = new NextRequest("http://localhost/api/admin/audit-logs");
    expect((await GET(request)).status).toBe(403);
  });
});
