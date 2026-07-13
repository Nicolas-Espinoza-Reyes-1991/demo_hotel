import { handleApiError, jsonError, jsonOk } from "@/lib/api-response";
import prisma from "@/lib/prisma";

type RouteParams = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const existing = await prisma.roomPriceRule.findUnique({ where: { id } });
    if (!existing) {
      return jsonError("Tarifa no encontrada.", 404);
    }

    await prisma.roomPriceRule.delete({ where: { id } });
    return jsonOk({ message: "Tarifa eliminada." });
  } catch (error) {
    return handleApiError(error);
  }
}
