import { PaymentStatus } from "@prisma/client";
import type { BankTransferConfig } from "@/types/payments";
import { checkRoomAvailability } from "./availability";
import {
  buildReservationEmailPayload,
  sendBankTransferInstructionsEmail,
} from "./email";
import prisma from "./prisma";
import type { PaymentResult } from "./payment";
import { assertReservationPayable, computeBankTransferExpiresAt } from "./reservation-holds";

export type { BankTransferConfig };

export const BANK_TRANSFER_SETTINGS_ID = "default";

function optionalTrim(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function buildConfig(input: {
  enabled: boolean;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  accountType?: string | null;
  taxId?: string | null;
  cbu?: string | null;
  alias?: string | null;
  swift?: string | null;
  contactEmail?: string | null;
  deadlineHours?: number | null;
  notes?: string | null;
}): BankTransferConfig | null {
  const bankName = input.bankName.trim();
  const accountHolder = input.accountHolder.trim();
  const accountNumber = input.accountNumber.trim();

  if (!input.enabled || !bankName || !accountHolder || !accountNumber) {
    return null;
  }

  const deadlineHours = Number(input.deadlineHours ?? 48);

  return {
    enabled: true,
    bankName,
    accountHolder,
    accountNumber,
    accountType: optionalTrim(input.accountType) || "Cuenta corriente",
    taxId: optionalTrim(input.taxId),
    cbu: optionalTrim(input.cbu),
    alias: optionalTrim(input.alias),
    swift: optionalTrim(input.swift),
    contactEmail: optionalTrim(input.contactEmail),
    deadlineHours: Number.isFinite(deadlineHours) && deadlineHours > 0 ? deadlineHours : 48,
    notes: optionalTrim(input.notes),
  };
}

/** Configuración solo desde variables de entorno (sin DB). */
export function getBankTransferConfigFromEnv(): BankTransferConfig | null {
  const explicitlyDisabled = process.env.BANK_TRANSFER_ENABLED?.trim().toLowerCase() === "false";
  if (explicitlyDisabled) return null;

  return buildConfig({
    enabled: true,
    bankName: process.env.BANK_NAME ?? "",
    accountHolder: process.env.BANK_ACCOUNT_HOLDER ?? "",
    accountNumber: process.env.BANK_ACCOUNT_NUMBER ?? "",
    accountType: process.env.BANK_ACCOUNT_TYPE,
    taxId: process.env.BANK_TAX_ID,
    cbu: process.env.BANK_CBU,
    alias: process.env.BANK_ALIAS,
    swift: process.env.BANK_SWIFT,
    contactEmail: process.env.BANK_CONTACT_EMAIL,
    deadlineHours: Number(process.env.BANK_TRANSFER_DEADLINE_HOURS ?? "48"),
    notes: process.env.BANK_TRANSFER_NOTES,
  });
}

async function getStoredBankTransferSettings() {
  try {
    return await prisma.bankTransferSettings.findUnique({
      where: { id: BANK_TRANSFER_SETTINGS_ID },
    });
  } catch {
    return null;
  }
}

/**
 * Lee datos bancarios: fila en DB (si el admin la guardó) con fallback a env.
 * `BANK_TRANSFER_ENABLED=false` desactiva el método aunque haya fila en DB.
 */
export async function getBankTransferConfig(): Promise<BankTransferConfig | null> {
  const explicitlyDisabled = process.env.BANK_TRANSFER_ENABLED?.trim().toLowerCase() === "false";
  if (explicitlyDisabled) return null;

  const stored = await getStoredBankTransferSettings();
  if (stored) {
    return buildConfig(stored);
  }

  return getBankTransferConfigFromEnv();
}

export async function isBankTransferEnabled(): Promise<boolean> {
  return (await getBankTransferConfig())?.enabled ?? false;
}

export type BankTransferAdminPayload = {
  enabled: boolean;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  accountType: string;
  taxId?: string | null;
  cbu?: string | null;
  alias?: string | null;
  swift?: string | null;
  contactEmail?: string | null;
  deadlineHours: number;
  notes?: string | null;
};

export type BankTransferAdminState = {
  settings: BankTransferAdminPayload;
  source: "database" | "environment";
  persisted: boolean;
  updatedBy: string | null;
  updatedAt: string | null;
};

export async function getBankTransferAdminState(): Promise<BankTransferAdminState> {
  const stored = await getStoredBankTransferSettings();
  if (stored) {
    return {
      persisted: true,
      source: "database",
      updatedBy: stored.updatedBy,
      updatedAt: stored.updatedAt.toISOString(),
      settings: {
        enabled: stored.enabled,
        bankName: stored.bankName,
        accountHolder: stored.accountHolder,
        accountNumber: stored.accountNumber,
        accountType: stored.accountType,
        taxId: stored.taxId,
        cbu: stored.cbu,
        alias: stored.alias,
        swift: stored.swift,
        contactEmail: stored.contactEmail,
        deadlineHours: stored.deadlineHours,
        notes: stored.notes,
      },
    };
  }

  const fromEnv = getBankTransferConfigFromEnv();
  return {
    persisted: false,
    source: "environment",
    updatedBy: null,
    updatedAt: null,
    settings: {
      enabled: Boolean(fromEnv),
      bankName: fromEnv?.bankName ?? process.env.BANK_NAME?.trim() ?? "",
      accountHolder: fromEnv?.accountHolder ?? process.env.BANK_ACCOUNT_HOLDER?.trim() ?? "",
      accountNumber: fromEnv?.accountNumber ?? process.env.BANK_ACCOUNT_NUMBER?.trim() ?? "",
      accountType: fromEnv?.accountType ?? process.env.BANK_ACCOUNT_TYPE?.trim() ?? "Cuenta corriente",
      taxId: fromEnv?.taxId ?? process.env.BANK_TAX_ID?.trim() ?? null,
      cbu: fromEnv?.cbu ?? process.env.BANK_CBU?.trim() ?? null,
      alias: fromEnv?.alias ?? process.env.BANK_ALIAS?.trim() ?? null,
      swift: fromEnv?.swift ?? process.env.BANK_SWIFT?.trim() ?? null,
      contactEmail: fromEnv?.contactEmail ?? process.env.BANK_CONTACT_EMAIL?.trim() ?? null,
      deadlineHours:
        fromEnv?.deadlineHours ??
        (Number(process.env.BANK_TRANSFER_DEADLINE_HOURS ?? "48") || 48),
      notes: fromEnv?.notes ?? process.env.BANK_TRANSFER_NOTES?.trim() ?? null,
    },
  };
}

export type BankTransferActor = {
  userId?: string | null;
  username: string;
};

function serializeAdminPayload(row: {
  enabled: boolean;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  accountType: string;
  taxId: string | null;
  cbu: string | null;
  alias: string | null;
  swift: string | null;
  contactEmail: string | null;
  deadlineHours: number;
  notes: string | null;
}): BankTransferAdminPayload {
  return {
    enabled: row.enabled,
    bankName: row.bankName,
    accountHolder: row.accountHolder,
    accountNumber: row.accountNumber,
    accountType: row.accountType,
    taxId: row.taxId,
    cbu: row.cbu,
    alias: row.alias,
    swift: row.swift,
    contactEmail: row.contactEmail,
    deadlineHours: row.deadlineHours,
    notes: row.notes,
  };
}

function collectChangedFields(
  previous: BankTransferAdminPayload | null,
  next: BankTransferAdminPayload
): string[] {
  if (!previous) {
    return [
      "enabled",
      "bankName",
      "accountHolder",
      "accountNumber",
      "accountType",
      "taxId",
      "contactEmail",
      "deadlineHours",
      "notes",
    ];
  }

  const keys: (keyof BankTransferAdminPayload)[] = [
    "enabled",
    "bankName",
    "accountHolder",
    "accountNumber",
    "accountType",
    "taxId",
    "cbu",
    "alias",
    "swift",
    "contactEmail",
    "deadlineHours",
    "notes",
  ];

  return keys.filter((key) => {
    const before = previous[key] ?? null;
    const after = next[key] ?? null;
    return String(before ?? "") !== String(after ?? "");
  });
}

export async function upsertBankTransferSettings(
  data: BankTransferAdminPayload,
  actor?: BankTransferActor
): Promise<BankTransferAdminPayload & { updatedBy: string | null; updatedAt: string }> {
  const deadlineHours =
    Number.isFinite(data.deadlineHours) && data.deadlineHours > 0 ? Math.round(data.deadlineHours) : 48;

  const previousRow = await getStoredBankTransferSettings();
  const previous = previousRow ? serializeAdminPayload(previousRow) : null;

  const actorName = actor?.username.trim() || null;
  const actorId = actor?.userId?.trim() || null;

  const row = await prisma.bankTransferSettings.upsert({
    where: { id: BANK_TRANSFER_SETTINGS_ID },
    create: {
      id: BANK_TRANSFER_SETTINGS_ID,
      enabled: data.enabled,
      bankName: data.bankName.trim(),
      accountHolder: data.accountHolder.trim(),
      accountNumber: data.accountNumber.trim(),
      accountType: data.accountType.trim() || "Cuenta corriente",
      taxId: optionalTrim(data.taxId) ?? null,
      cbu: optionalTrim(data.cbu) ?? null,
      alias: optionalTrim(data.alias) ?? null,
      swift: optionalTrim(data.swift) ?? null,
      contactEmail: optionalTrim(data.contactEmail) ?? null,
      deadlineHours,
      notes: optionalTrim(data.notes) ?? null,
      updatedBy: actorName,
      updatedById: actorId,
    },
    update: {
      enabled: data.enabled,
      bankName: data.bankName.trim(),
      accountHolder: data.accountHolder.trim(),
      accountNumber: data.accountNumber.trim(),
      accountType: data.accountType.trim() || "Cuenta corriente",
      taxId: optionalTrim(data.taxId) ?? null,
      cbu: optionalTrim(data.cbu) ?? null,
      alias: optionalTrim(data.alias) ?? null,
      swift: optionalTrim(data.swift) ?? null,
      contactEmail: optionalTrim(data.contactEmail) ?? null,
      deadlineHours,
      notes: optionalTrim(data.notes) ?? null,
      updatedBy: actorName,
      updatedById: actorId,
    },
  });

  const settings = serializeAdminPayload(row);
  const changedFields = collectChangedFields(previous, settings);

  if (actorName) {
    const { AUDIT_ACTIONS, writeAdminAudit } = await import("@/lib/admin-audit");
    await writeAdminAudit({
      action: AUDIT_ACTIONS.BANK_TRANSFER_UPDATE,
      actor: { username: actorName, userId: actorId },
      targetType: "bank_transfer",
      targetId: BANK_TRANSFER_SETTINGS_ID,
      summary: `${actorName} actualizó datos de transferencia (${settings.bankName} · ${settings.accountNumber})`,
      metadata: {
        enabled: settings.enabled,
        bankName: settings.bankName,
        accountHolder: settings.accountHolder,
        accountNumber: settings.accountNumber,
        accountType: settings.accountType,
        taxId: settings.taxId,
        contactEmail: settings.contactEmail,
        deadlineHours: settings.deadlineHours,
        changedFields,
      },
    });
  }

  return {
    ...settings,
    updatedBy: row.updatedBy,
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function assertReservationStillAvailable(reservation: {
  id: string;
  roomId: string;
  checkIn: Date;
  checkOut: Date;
}) {
  const availability = await checkRoomAvailability(
    reservation.roomId,
    reservation.checkIn,
    reservation.checkOut,
    reservation.id
  );

  if (!availability.available) {
    throw new Error(
      availability.conflicts[0]?.message ??
        "La habitación ya no está disponible para registrar la transferencia."
    );
  }
}

export async function processBankTransferPayment(reservationId: string): Promise<PaymentResult> {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { room: true, guest: true },
  });

  if (!reservation) {
    throw new Error("Reserva no encontrada.");
  }

  assertReservationPayable(reservation);

  if (reservation.paymentStatus === PaymentStatus.PAID) {
    return {
      success: true,
      transactionId: reservation.confirmationCode,
      paymentStatus: PaymentStatus.PAID,
      message: "El pago ya fue registrado.",
      provider: "BANK_TRANSFER",
    };
  }

  await assertReservationStillAvailable(reservation);

  const config = await getBankTransferConfig();
  if (!config) {
    throw new Error("La transferencia bancaria no está disponible.");
  }

  await prisma.reservation.update({
    where: { id: reservationId },
    data: {
      paymentProvider: "BANK_TRANSFER",
      paymentStatus: PaymentStatus.PENDING,
      expiresAt: computeBankTransferExpiresAt(config.deadlineHours),
    },
  });

  void sendBankTransferInstructionsEmail(buildReservationEmailPayload(reservation), config);

  return {
    success: true,
    transactionId: reservation.confirmationCode,
    paymentStatus: PaymentStatus.PENDING,
    message:
      "Reserva registrada. Realiza la transferencia con el código de referencia para confirmar tu estadía.",
    provider: "BANK_TRANSFER",
  };
}
