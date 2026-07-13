import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-response";
import { toDateOnly } from "@/lib/dates";
import { priceRuleRangesOverlap } from "@/lib/room-pricing";
import prisma from "@/lib/prisma";

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const createPriceRulesSchema = z
  .object({
    name: z.string().trim().max(120).optional(),
    startDate: dateOnly,
    endDate: dateOnly,
    items: z
      .array(
        z.object({
          roomId: z.string().min(1),
          pricePerNight: z.coerce.number().positive().max(999999),
        })
      )
      .min(1)
      .max(100),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: "La fecha de fin debe ser posterior al inicio.",
    path: ["endDate"],
  });

const priceRuleQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  roomId: z.string().min(1).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(10),
});

function serializeRule(rule: {
  id: string;
  roomId: string;
  startDate: Date;
  endDate: Date;
  pricePerNight: Prisma.Decimal | number;
  name: string | null;
  room: { code: string; name: string };
}) {
  return {
    id: rule.id,
    roomId: rule.roomId,
    roomCode: rule.room.code,
    roomName: rule.room.name,
    startDate: rule.startDate.toISOString().slice(0, 10),
    endDate: rule.endDate.toISOString().slice(0, 10),
    pricePerNight: Number(rule.pricePerNight),
    name: rule.name,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = priceRuleQuerySchema.safeParse({
      q: searchParams.get("q") ?? undefined,
      roomId: searchParams.get("roomId") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
    });

    if (!parsed.success) {
      return jsonError("Filtros inválidos.", 400, parsed.error.flatten());
    }

    const q = parsed.data.q?.trim();
    const where: Prisma.RoomPriceRuleWhereInput = {
      ...(parsed.data.roomId ? { roomId: parsed.data.roomId } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { room: { code: { contains: q, mode: "insensitive" } } },
              { room: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const skip = (parsed.data.page - 1) * parsed.data.pageSize;
    const take = parsed.data.pageSize;

    const [total, rules] = await Promise.all([
      prisma.roomPriceRule.count({ where }),
      prisma.roomPriceRule.findMany({
        where,
        include: { room: { select: { code: true, name: true } } },
        orderBy: [{ startDate: "asc" }, { room: { code: "asc" } }],
        skip,
        take,
      }),
    ]);

    return jsonOk({
      count: rules.length,
      total,
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
      totalPages: Math.max(1, Math.ceil(total / parsed.data.pageSize)),
      rules: rules.map(serializeRule),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createPriceRulesSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Datos inválidos.", 400, parsed.error.flatten());
    }

    const start = toDateOnly(parsed.data.startDate);
    const end = toDateOnly(parsed.data.endDate);
    const name = parsed.data.name?.trim() || null;
    const roomIds = [...new Set(parsed.data.items.map((item) => item.roomId))];

    const created = await prisma.$transaction(
      async (tx) => {
        const rooms = await tx.room.findMany({
          where: { id: { in: roomIds } },
          select: { id: true, code: true, name: true },
        });
        if (rooms.length !== roomIds.length) {
          throw new Error("Una o más habitaciones no existen.");
        }

        const existing = await tx.roomPriceRule.findMany({
          where: {
            roomId: { in: roomIds },
            startDate: { lt: end },
            endDate: { gt: start },
          },
          include: { room: { select: { code: true } } },
        });

        for (const rule of existing) {
          if (priceRuleRangesOverlap(start, end, rule.startDate, rule.endDate)) {
            throw new Error(
              `La habitación ${rule.room.code} ya tiene una tarifa del ${rule.startDate
                .toISOString()
                .slice(0, 10)} al ${rule.endDate.toISOString().slice(0, 10)}${
                rule.name ? ` (${rule.name})` : ""
              }. Eliminala o ajustá las fechas.`
            );
          }
        }

        const priceByRoom = new Map(parsed.data.items.map((item) => [item.roomId, item.pricePerNight]));
        const results = [];

        for (const roomId of roomIds) {
          const pricePerNight = priceByRoom.get(roomId);
          if (pricePerNight == null) continue;

          const rule = await tx.roomPriceRule.create({
            data: {
              roomId,
              startDate: start,
              endDate: end,
              pricePerNight,
              name,
            },
            include: { room: { select: { code: true, name: true } } },
          });
          results.push(serializeRule(rule));
        }

        return results;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    return jsonOk({ count: created.length, rules: created }, 201);
  } catch (error) {
    if (error instanceof Error && error.message.includes("no existen")) {
      return jsonError(error.message, 404);
    }
    if (error instanceof Error && error.message.includes("ya tiene una tarifa")) {
      return jsonError(error.message, 409, undefined, "PRICE_RULE_OVERLAP");
    }
    if (error instanceof Error && error.message.includes("fecha")) {
      return jsonError(error.message, 400);
    }
    return handleApiError(error);
  }
}
