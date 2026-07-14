import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockCreate, mockFindMany } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockFindMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    adminAuditLog: {
      create: mockCreate,
      findMany: mockFindMany,
    },
  },
}));

import {
  AUDIT_ACTIONS,
  listAdminAuditLogs,
  writeAdminAudit,
} from "./admin-audit";

describe("admin-audit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mockResolvedValue({ id: "a1" });
    mockFindMany.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writeAdminAudit persiste el evento", async () => {
    await writeAdminAudit({
      action: AUDIT_ACTIONS.USER_PASSWORD_CHANGE,
      actor: { username: "nelson", userId: "u1" },
      targetType: "staff_user",
      targetId: "u2",
      summary: "nelson cambió la contraseña de recepcion",
      metadata: { targetUsername: "recepcion" },
    });

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: AUDIT_ACTIONS.USER_PASSWORD_CHANGE,
        actorName: "nelson",
        actorId: "u1",
        targetId: "u2",
      }),
    });
  });

  it("writeAdminAudit no lanza si Prisma falla", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockCreate.mockRejectedValue(new Error("db down"));

    await expect(
      writeAdminAudit({
        action: AUDIT_ACTIONS.BANK_TRANSFER_UPDATE,
        actor: { username: "nelson" },
        summary: "fallo",
      })
    ).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalled();
  });

  it("listAdminAuditLogs mapea fechas ISO", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: "log1",
        action: AUDIT_ACTIONS.BANK_TRANSFER_UPDATE,
        actorId: "u1",
        actorName: "nelson",
        targetType: "bank_transfer",
        targetId: "default",
        summary: "nelson actualizó datos",
        metadata: { bankName: "Santander" },
        createdAt: new Date("2026-07-14T12:00:00.000Z"),
      },
    ]);

    const logs = await listAdminAuditLogs({ action: AUDIT_ACTIONS.BANK_TRANSFER_UPDATE, limit: 5 });
    expect(logs).toHaveLength(1);
    expect(logs[0]?.createdAt).toBe("2026-07-14T12:00:00.000Z");
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { action: AUDIT_ACTIONS.BANK_TRANSFER_UPDATE },
        take: 5,
      })
    );
  });
});
