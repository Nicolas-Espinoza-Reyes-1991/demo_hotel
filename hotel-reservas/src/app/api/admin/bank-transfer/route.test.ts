import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockRequireAdmin, mockGetState, mockUpsert, mockListAudit } = vi.hoisted(() => ({
  mockRequireAdmin: vi.fn(),
  mockGetState: vi.fn(),
  mockUpsert: vi.fn(),
  mockListAudit: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireAdminSession: mockRequireAdmin,
}));

vi.mock("@/lib/bank-transfer", () => ({
  getBankTransferAdminState: mockGetState,
  upsertBankTransferSettings: mockUpsert,
}));

vi.mock("@/lib/admin-audit", () => ({
  AUDIT_ACTIONS: {
    USER_PASSWORD_CHANGE: "user.password_change",
    BANK_TRANSFER_UPDATE: "bank_transfer.update",
  },
  listAdminAuditLogs: mockListAudit,
}));

import { GET, PUT } from "./route";

describe("/api/admin/bank-transfer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ username: "admin", role: "ADMIN", userId: "u1" });
    mockGetState.mockResolvedValue({
      persisted: false,
      source: "environment",
      updatedBy: null,
      updatedAt: null,
      settings: {
        enabled: true,
        bankName: "Banco Santander",
        accountHolder: "Nelson Boye",
        accountNumber: "69021042",
        accountType: "Cuenta Corriente",
        taxId: "8965278-2",
        contactEmail: "reservas@lacasonadefutrono.cl",
        deadlineHours: 48,
        notes: null,
      },
    });
    mockListAudit.mockResolvedValue([]);
    mockUpsert.mockImplementation(async (data, actor) => ({
      ...data,
      updatedBy: actor?.username ?? null,
      updatedAt: "2026-07-14T12:00:00.000Z",
    }));
  });

  it("GET retorna estado bancario para ADMIN", async () => {
    const response = await GET();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.settings.bankName).toBe("Banco Santander");
    expect(body.recentActivity).toEqual([]);
    expect(mockRequireAdmin).toHaveBeenCalled();
  });

  it("PUT guarda datos bancarios válidos con actor", async () => {
    const request = new NextRequest("http://localhost", {
      method: "PUT",
      body: JSON.stringify({
        enabled: true,
        bankName: "Banco Santander",
        accountHolder: "Nelson Boye",
        accountNumber: "69021042",
        accountType: "Cuenta Corriente",
        taxId: "8965278-2",
        contactEmail: "reservas@lacasonadefutrono.cl",
        deadlineHours: 48,
      }),
    });

    const response = await PUT(request);
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.persisted).toBe(true);
    expect(body.updatedBy).toBe("admin");
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ bankName: "Banco Santander" }),
      expect.objectContaining({ username: "admin", userId: "u1" })
    );
  });

  it("PUT rechaza payload incompleto", async () => {
    const request = new NextRequest("http://localhost", {
      method: "PUT",
      body: JSON.stringify({ enabled: true, bankName: "" }),
    });

    expect((await PUT(request)).status).toBe(400);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("exige sesión ADMIN", async () => {
    const { AppError } = await import("@/lib/api-response");
    mockRequireAdmin.mockRejectedValue(
      new AppError("Solo el administrador puede realizar esta acción.", 403, "FORBIDDEN")
    );

    const response = await GET();
    expect(response.status).toBe(403);
  });
});
