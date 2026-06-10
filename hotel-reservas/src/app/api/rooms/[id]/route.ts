import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-response";
import { normalizeRoomUpdateInput, serializeRoom } from "@/lib/rooms";
import prisma from "@/lib/prisma";
import { updateRoomAdminSchema } from "@/lib/validations";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * PATCH /api/rooms/[id]
 * Actualiza una habitación (admin).
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateRoomAdminSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Datos de habitación inválidos.", 400, parsed.error.flatten());
    }

    if (Object.keys(parsed.data).length === 0) {
      return jsonError("No hay cambios para guardar.", 400);
    }

    const current = await prisma.room.findUnique({ where: { id } });
    if (!current) {
      return jsonError("Habitación no encontrada.", 404);
    }

    if (parsed.data.code && parsed.data.code !== current.code) {
      const duplicate = await prisma.room.findUnique({ where: { code: parsed.data.code } });
      if (duplicate) {
        return jsonError(`Ya existe una habitación con el código ${parsed.data.code}.`, 409, undefined, "DUPLICATE_CODE");
      }
    }

    const room = await prisma.room.update({
      where: { id },
      data: normalizeRoomUpdateInput(parsed.data),
    });

    return jsonOk({
      message: "Habitación actualizada.",
      room: serializeRoom(room),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/rooms/[id]
 * Elimina una habitación si no tiene reservas asociadas.
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const current = await prisma.room.findUnique({ where: { id } });
    if (!current) {
      return jsonError("Habitación no encontrada.", 404);
    }

    const reservationCount = await prisma.reservation.count({ where: { roomId: id } });
    if (reservationCount > 0) {
      return jsonError(
        "No se puede eliminar: la habitación tiene reservas asociadas. Podés marcarla como bloqueada o en mantenimiento.",
        409,
        { reservationCount },
        "HAS_RESERVATIONS"
      );
    }

    await prisma.room.delete({ where: { id } });

    return jsonOk({
      message: `Habitación ${current.code} eliminada.`,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return jsonError(
        "No se puede eliminar: la habitación tiene datos relacionados.",
        409,
        undefined,
        "HAS_RELATIONS"
      );
    }
    return handleApiError(error);
  }
}
