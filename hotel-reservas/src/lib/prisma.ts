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
    const hasPriceRules = typeof (existing as PrismaClient & { roomPriceRule?: unknown }).roomPriceRule !== "undefined";
    if (process.env.NODE_ENV === "production" || hasPriceRules) {
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
