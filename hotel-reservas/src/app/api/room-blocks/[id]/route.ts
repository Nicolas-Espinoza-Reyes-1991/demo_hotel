import { handleApiError, jsonError, jsonOk } from "@/lib/api-response";
import prisma from "@/lib/prisma";

type RouteParams = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const existing = await prisma.roomBlock.findUnique({ where: { id } });
    if (!existing) {
      return jsonError("Bloqueo no encontrado.", 404);
    }

    await prisma.roomBlock.delete({ where: { id } });
    return jsonOk({ message: "Bloqueo eliminado." });
  } catch (error) {
    return handleApiError(error);
  }
}
