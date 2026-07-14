import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-response";
import { requireAdminSession } from "@/lib/auth";
import {
  getBankTransferAdminState,
  upsertBankTransferSettings,
} from "@/lib/bank-transfer";
import { AUDIT_ACTIONS, listAdminAuditLogs } from "@/lib/admin-audit";

export const runtime = "nodejs";

const optionalText = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (value == null) return null;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  });

const updateSchema = z.object({
  enabled: z.boolean(),
  bankName: z.string().trim().min(1, "Indicá el banco.").max(120),
  accountHolder: z.string().trim().min(1, "Indicá el titular.").max(120),
  accountNumber: z.string().trim().min(1, "Indicá el número de cuenta.").max(64),
  accountType: z.string().trim().min(1).max(80).default("Cuenta corriente"),
  taxId: optionalText,
  cbu: optionalText,
  alias: optionalText,
  swift: optionalText,
  contactEmail: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => {
      if (value == null) return null;
      const trimmed = value.trim();
      return trimmed ? trimmed : null;
    })
    .refine((value) => value == null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), {
      message: "Email de contacto inválido.",
    }),
  deadlineHours: z.coerce.number().int().min(1).max(168).default(48),
  notes: optionalText,
});

export async function GET() {
  try {
    await requireAdminSession();
    const [state, recentActivity] = await Promise.all([
      getBankTransferAdminState(),
      listAdminAuditLogs({ action: AUDIT_ACTIONS.BANK_TRANSFER_UPDATE, limit: 10 }),
    ]);
    return jsonOk({ ...state, recentActivity });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireAdminSession();
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Datos bancarios inválidos.", 400, parsed.error.flatten());
    }

    const saved = await upsertBankTransferSettings(parsed.data, {
      username: session.username,
      userId: session.userId || null,
    });
    const { updatedBy, updatedAt, ...settings } = saved;
    const recentActivity = await listAdminAuditLogs({
      action: AUDIT_ACTIONS.BANK_TRANSFER_UPDATE,
      limit: 10,
    });

    return jsonOk({
      settings,
      source: "database" as const,
      persisted: true,
      updatedBy,
      updatedAt,
      recentActivity,
      message: "Datos bancarios actualizados.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
