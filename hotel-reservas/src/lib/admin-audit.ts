import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  AUDIT_ACTIONS,
  type AuditAction,
  type PublicAdminAuditLog,
} from "@/types/admin-audit";

export { AUDIT_ACTIONS };
export type { AuditAction, PublicAdminAuditLog };

export type AuditActor = {
  userId?: string | null;
  username: string;
};

export type WriteAdminAuditInput = {
  action: AuditAction | string;
  actor: AuditActor;
  targetType?: string | null;
  targetId?: string | null;
  summary: string;
  metadata?: Prisma.InputJsonValue | null;
};

/**
 * Registra una acción sensible del panel.
 * Best-effort: un fallo de auditoría no revierte la operación principal.
 */
export async function writeAdminAudit(input: WriteAdminAuditInput): Promise<void> {
  const actorName = input.actor.username.trim() || "admin";
  try {
    await prisma.adminAuditLog.create({
      data: {
        action: input.action,
        actorId: input.actor.userId?.trim() || null,
        actorName,
        targetType: input.targetType?.trim() || null,
        targetId: input.targetId?.trim() || null,
        summary: input.summary.trim(),
        metadata: input.metadata ?? undefined,
      },
    });
  } catch (error) {
    console.error("[admin-audit] No se pudo registrar el evento:", error);
  }
}

export async function listAdminAuditLogs(options?: {
  action?: string;
  limit?: number;
}): Promise<PublicAdminAuditLog[]> {
  const limit = Math.min(Math.max(options?.limit ?? 20, 1), 100);
  const action = options?.action?.trim() || undefined;

  const rows = await prisma.adminAuditLog.findMany({
    where: action ? { action } : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    actorId: row.actorId,
    actorName: row.actorName,
    targetType: row.targetType,
    targetId: row.targetId,
    summary: row.summary,
    metadata: row.metadata,
    createdAt: row.createdAt.toISOString(),
  }));
}
