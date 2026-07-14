import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

/**
 * Cliente Prisma singleton.
 * Siempre se cachea en globalThis (dev y prod) para evitar abrir un pool
 * nuevo por cada request — en Docker/Postgres eso agota max_connections.
 *
 * En desarrollo, si el schema agregó modelos nuevos y el proceso sigue con un
 * cliente viejo en memoria, recreamos el singleton.
 */
function getPrismaClient(): PrismaClient {
  const existing = globalForPrisma.prisma;
  if (existing) {
    const client = existing as PrismaClient & {
      roomPriceRule?: unknown;
      bankTransferSettings?: unknown;
      adminAuditLog?: unknown;
    };
    const schemaOk =
      typeof client.roomPriceRule !== "undefined" &&
      typeof client.bankTransferSettings !== "undefined" &&
      typeof client.adminAuditLog !== "undefined";
    if (process.env.NODE_ENV === "production" || schemaOk) {
      return existing;
    }
    void existing.$disconnect().catch(() => undefined);
  }

  const client = createPrismaClient();
  globalForPrisma.prisma = client;
  return client;
}

export const prisma: PrismaClient = getPrismaClient();

export default prisma;
