import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-response";
import { serializeRoom } from "@/lib/rooms";
import prisma from "@/lib/prisma";

const roomQuerySchema = z.object({
  status: z.enum(["AVAILABLE", "MAINTENANCE", "BLOCKED"]).optional(),
  type: z.enum(["STANDARD", "SUPERIOR", "DELUXE", "SUITE", "FAMILY"]).optional(),
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
 * GET /api/public/rooms
 * Endpoint público de solo lectura para mostrar habitaciones en la landing.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = roomQuerySchema.safeParse({
      status: searchParams.get("status") ?? undefined,
      type: searchParams.get("type") ?? undefined,
    });

    if (!parsed.success) {
      return withCorsHeaders(
        jsonError("Filtros de habitación inválidos.", 400, parsed.error.flatten())
      );
    }

    const rooms = await prisma.room.findMany({
      where: {
        ...(parsed.data.status ? { status: parsed.data.status } : {}),
        ...(parsed.data.type ? { type: parsed.data.type } : {}),
      },
      orderBy: [{ floor: "asc" }, { code: "asc" }],
    });

    return withCorsHeaders(
      jsonOk({
        count: rooms.length,
        rooms: rooms.map(serializeRoom),
      })
    );
  } catch (error) {
    return withCorsHeaders(handleApiError(error));
  }
}
