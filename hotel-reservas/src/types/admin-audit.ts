export const AUDIT_ACTIONS = {
  USER_PASSWORD_CHANGE: "user.password_change",
  BANK_TRANSFER_UPDATE: "bank_transfer.update",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export type PublicAdminAuditLog = {
  id: string;
  action: string;
  actorId: string | null;
  actorName: string;
  targetType: string | null;
  targetId: string | null;
  summary: string;
  metadata: unknown;
  createdAt: string;
};
