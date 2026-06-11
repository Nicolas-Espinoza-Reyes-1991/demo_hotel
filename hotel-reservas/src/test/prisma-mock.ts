import { vi } from "vitest";
import type { Prisma } from "@prisma/client";

export type MockDbClient = {
  room: {
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  reservation: {
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  roomBlock: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  guest: {
    upsert: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
  $queryRaw: ReturnType<typeof vi.fn>;
};

export function createMockDb(): MockDbClient {
  return {
    room: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    reservation: {
      findMany: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    roomBlock: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    guest: {
      upsert: vi.fn(),
    },
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
  };
}

/** Mock Prisma listo para vi.hoisted (evita TDZ con imports ESM). */
export function createHoistedPrismaMock() {
  return createMockDb();
}

export function mockTransaction(
  db: MockDbClient,
  handler: (tx: MockDbClient) => Promise<unknown>
) {
  db.$transaction.mockImplementation(async (callback: (tx: MockDbClient) => Promise<unknown>, options?: { isolationLevel?: string }) => {
    expect(options?.isolationLevel).toBe("Serializable");
    return callback(db);
  });
  return handler;
}
