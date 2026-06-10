import { vi } from "vitest";

/** Objeto mock Prisma para usar dentro de vi.hoisted (sin imports externos). */
export function inlinePrismaMock() {
  return {
    room: { findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    reservation: {
      findMany: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    roomBlock: { findMany: vi.fn(), count: vi.fn(), create: vi.fn(), delete: vi.fn() },
    guest: { upsert: vi.fn() },
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
  };
}
