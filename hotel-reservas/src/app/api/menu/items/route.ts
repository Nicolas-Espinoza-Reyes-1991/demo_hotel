import { NextRequest } from "next/server";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-response";
import { requireSession } from "@/lib/auth";
import { serializeMenuItem, toMenuItemCreateData } from "@/lib/menu";
import { createMenuItemSchema } from "@/lib/menu-validations";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * GET /api/menu/items — listado plano admin.
 */
export async function GET() {
  try {
    await requireSession();
    const items = await prisma.menuItem.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return jsonOk({ items: items.map(serializeMenuItem) });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/menu/items — crea producto.
 */
export async function POST(request: NextRequest) {
  try {
    await requireSession();
    const body = await request.json();
    const parsed = createMenuItemSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Datos de producto inválidos.", 400, parsed.error.flatten());
    }

    const category = await prisma.menuCategory.findUnique({
      where: { id: parsed.data.categoryId },
    });
    if (!category) {
      return jsonError("La categoría no existe.", 404);
    }

    const maxSort = await prisma.menuItem.aggregate({
      where: { categoryId: parsed.data.categoryId },
      _max: { sortOrder: true },
    });

    const item = await prisma.menuItem.create({
      data: toMenuItemCreateData({
        ...parsed.data,
        sortOrder: parsed.data.sortOrder ?? (maxSort._max.sortOrder ?? -1) + 1,
      }),
    });

    return jsonOk({ item: serializeMenuItem(item), message: "Producto creado." }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
