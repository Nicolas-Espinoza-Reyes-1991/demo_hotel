import { NextRequest } from "next/server";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-response";
import { requireSession } from "@/lib/auth";
import { parseMenuTags, serializeMenuItem } from "@/lib/menu";
import { updateMenuItemSchema } from "@/lib/menu-validations";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    await requireSession();
    const { id } = await params;
    const body = await request.json();
    const parsed = updateMenuItemSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Datos de producto inválidos.", 400, parsed.error.flatten());
    }

    const existing = await prisma.menuItem.findUnique({ where: { id } });
    if (!existing) {
      return jsonError("Producto no encontrado.", 404);
    }

    if (parsed.data.categoryId) {
      const category = await prisma.menuCategory.findUnique({
        where: { id: parsed.data.categoryId },
      });
      if (!category) {
        return jsonError("La categoría no existe.", 404);
      }
    }

    const item = await prisma.menuItem.update({
      where: { id },
      data: {
        ...(parsed.data.categoryId !== undefined ? { categoryId: parsed.data.categoryId } : {}),
        ...(parsed.data.name !== undefined ? { name: parsed.data.name.trim() } : {}),
        ...(parsed.data.description !== undefined
          ? { description: parsed.data.description?.trim() || null }
          : {}),
        ...(parsed.data.price !== undefined ? { price: parsed.data.price } : {}),
        ...(parsed.data.imageUrl !== undefined
          ? { imageUrl: parsed.data.imageUrl?.trim() || null }
          : {}),
        ...(parsed.data.tags !== undefined ? { tags: parseMenuTags(parsed.data.tags) } : {}),
        ...(parsed.data.available !== undefined ? { available: parsed.data.available } : {}),
        ...(parsed.data.featured !== undefined ? { featured: parsed.data.featured } : {}),
        ...(parsed.data.sortOrder !== undefined ? { sortOrder: parsed.data.sortOrder } : {}),
        ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {}),
      },
    });

    return jsonOk({ item: serializeMenuItem(item), message: "Producto actualizado." });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    await requireSession();
    const { id } = await params;
    const existing = await prisma.menuItem.findUnique({ where: { id } });
    if (!existing) {
      return jsonError("Producto no encontrado.", 404);
    }

    await prisma.menuItem.delete({ where: { id } });
    return jsonOk({ message: "Producto eliminado." });
  } catch (error) {
    return handleApiError(error);
  }
}
