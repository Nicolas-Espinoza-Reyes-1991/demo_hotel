import { randomBytes } from "crypto";
import type { Prisma } from "@prisma/client";

type DbClient = Prisma.TransactionClient | { reservation: { findUnique: Prisma.TransactionClient["reservation"]["findUnique"] } };

/** Código legible para huéspedes: BH-YYYYMMDD-XXXX */
export function buildConfirmationCode(checkIn: string): string {
  const datePart = checkIn.replace(/-/g, "").slice(0, 8);
  const suffix = randomBytes(2).toString("hex").toUpperCase();
  return `BH-${datePart}-${suffix}`;
}

export async function generateUniqueConfirmationCode(
  db: DbClient,
  checkIn: string,
  maxAttempts = 8
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = buildConfirmationCode(checkIn);
    const existing = await db.reservation.findUnique({
      where: { confirmationCode: code },
      select: { id: true },
    });
    if (!existing) return code;
  }

  const datePart = checkIn.replace(/-/g, "").slice(0, 8);
  return `BH-${datePart}-${randomBytes(3).toString("hex").toUpperCase()}`;
}
