import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-response";
import { checkRoomAvailability } from "@/lib/availability";
import { toDateOnly } from "@/lib/dates";
import prisma from "@/lib/prisma";

const createBlockSchema = z
  .object({
    roomId: z.string().min(1),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    reason: z.string().trim().max(500).optional(),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: "La fecha de fin debe ser posterior al inicio.",
    path: ["endDate"],
  });

const blockQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(10),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = blockQuerySchema.safeParse({
      q: searchParams.get("q") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
    });

    if (!parsed.success) {
      return jsonError("Filtros inválidos.", 400, parsed.error.flatten());
    }

    const q = parsed.data.q?.trim();
    const where = q
      ? {
          OR: [
            { reason: { contains: q, mode: "insensitive" as const } },
            { room: { code: { contains: q, mode: "insensitive" as const } } },
            { room: { name: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : undefined;

    const skip = (parsed.data.page - 1) * parsed.data.pageSize;
    const take = parsed.data.pageSize;

    const [total, blocks] = await Promise.all([
      prisma.roomBlock.count({ where }),
      prisma.roomBlock.findMany({
        where,
        include: { room: { select: { code: true, name: true } } },
        orderBy: { startDate: "asc" },
        skip,
        take,
      }),
    ]);

    return jsonOk({
      count: blocks.length,
      total,
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
      totalPages: Math.max(1, Math.ceil(total / parsed.data.pageSize)),
      blocks: blocks.map((block) => ({
        id: block.id,
        roomId: block.roomId,
        roomCode: block.room.code,
        roomName: block.room.name,
        startDate: block.startDate.toISOString().slice(0, 10),
        endDate: block.endDate.toISOString().slice(0, 10),
        reason: block.reason,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createBlockSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Datos inválidos.", 400, parsed.error.flatten());
    }

    const block = await prisma.$transaction(
      async (tx) => {
        const start = toDateOnly(parsed.data.startDate);
        const end = toDateOnly(parsed.data.endDate);

        const room = await tx.room.findUnique({ where: { id: parsed.data.roomId } });
        if (!room) {
          throw new Error("Habitación no encontrada.");
        }

        const availability = await checkRoomAvailability(room.id, start, end, undefined, tx);
        if (!availability.available) {
          const conflict = availability.conflicts[0];
          throw new Error(conflict?.message ?? "Hay conflictos en esas fechas.");
        }

        return tx.roomBlock.create({
          data: {
            roomId: room.id,
            startDate: start,
            endDate: end,
            reason: parsed.data.reason,
          },
          include: { room: { select: { code: true, name: true } } },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    return jsonOk(
      {
        block: {
          id: block.id,
          roomId: block.roomId,
          roomCode: block.room.code,
          roomName: block.room.name,
          startDate: block.startDate.toISOString().slice(0, 10),
          endDate: block.endDate.toISOString().slice(0, 10),
          reason: block.reason,
        },
      },
      201
    );
  } catch (error) {
    if (error instanceof Error && error.message === "Habitación no encontrada.") {
      return jsonError(error.message, 404);
    }
    if (error instanceof Error && error.message.includes("fecha")) {
      return jsonError(error.message, 400);
    }
    if (error instanceof Error) {
      return jsonError(error.message, 409, undefined, "NOT_AVAILABLE");
    }
    return handleApiError(error);
  }
}
