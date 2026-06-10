import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-response";
import { normalizeRoomCreateInput, serializeRoom } from "@/lib/rooms";
import prisma from "@/lib/prisma";
import { createRoomSchema } from "@/lib/validations";

const roomQuerySchema = z.object({
  status: z.enum(["AVAILABLE", "MAINTENANCE", "BLOCKED"]).optional(),
  type: z.enum(["STANDARD", "SUPERIOR", "DELUXE", "SUITE", "FAMILY"]).optional(),
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(10),
});

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const;

function withCorsHeaders(response: Response) {
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export async function OPTIONS() {
  return withCorsHeaders(new Response(null, { status: 204 }));
}

/**
 * GET /api/rooms
 * Lista todas las habitaciones del inventario.
 * Query opcional: ?status=AVAILABLE&type=SUITE
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = roomQuerySchema.safeParse({
      status: searchParams.get("status") ?? undefined,
      type: searchParams.get("type") ?? undefined,
      q: searchParams.get("q") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
    });

    if (!parsed.success) {
      return withCorsHeaders(
        jsonError("Filtros de habitación inválidos.", 400, parsed.error.flatten())
      );
    }

    const q = parsed.data.q?.trim();
    const where = {
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
      ...(parsed.data.type ? { type: parsed.data.type } : {}),
      ...(q
        ? {
            OR: [
              { code: { contains: q, mode: "insensitive" as const } },
              { name: { contains: q, mode: "insensitive" as const } },
              { description: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const skip = (parsed.data.page - 1) * parsed.data.pageSize;
    const take = parsed.data.pageSize;

    const [total, rooms] = await Promise.all([
      prisma.room.count({ where }),
      prisma.room.findMany({
        where,
        orderBy: [{ floor: "asc" }, { code: "asc" }],
        skip,
        take,
      }),
    ]);

    return withCorsHeaders(
      jsonOk({
        count: rooms.length,
        total,
        page: parsed.data.page,
        pageSize: parsed.data.pageSize,
        totalPages: Math.max(1, Math.ceil(total / parsed.data.pageSize)),
        rooms: rooms.map(serializeRoom),
      })
    );
  } catch (error) {
    return withCorsHeaders(handleApiError(error));
  }
}

/**
 * POST /api/rooms
 * Crea una habitación (admin).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createRoomSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Datos de habitación inválidos.", 400, parsed.error.flatten());
    }

    const existing = await prisma.room.findUnique({ where: { code: parsed.data.code } });
    if (existing) {
      return jsonError(`Ya existe una habitación con el código ${parsed.data.code}.`, 409, undefined, "DUPLICATE_CODE");
    }

    const room = await prisma.room.create({
      data: normalizeRoomCreateInput(parsed.data),
    });

    return jsonOk(
      {
        message: "Habitación creada correctamente.",
        room: serializeRoom(room),
      },
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}
