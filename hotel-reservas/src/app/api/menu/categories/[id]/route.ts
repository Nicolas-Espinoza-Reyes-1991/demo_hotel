import { NextRequest } from "next/server";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-response";
import { requireSession } from "@/lib/auth";
import { serializeMenuCategory, slugifyMenuLabel } from "@/lib/menu";
import { updateMenuCategorySchema } from "@/lib/menu-validations";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    await requireSession();
    const { id } = await params;
    const body = await request.json();
    const parsed = updateMenuCategorySchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Datos de categoría inválidos.", 400, parsed.error.flatten());
    }

    const existing = await prisma.menuCategory.findUnique({ where: { id } });
    if (!existing) {
      return jsonError("Categoría no encontrada.", 404);
    }

    const data: {
      name?: string;
      slug?: string;
      sortOrder?: number;
      active?: boolean;
    } = {};

    if (parsed.data.name !== undefined) data.name = parsed.data.name.trim();
    if (parsed.data.sortOrder !== undefined) data.sortOrder = parsed.data.sortOrder;
    if (parsed.data.active !== undefined) data.active = parsed.data.active;

    if (parsed.data.slug !== undefined) {
      data.slug = parsed.data.slug.trim();
    } else if (parsed.data.name !== undefined) {
      data.slug = slugifyMenuLabel(parsed.data.name);
    }

    if (data.slug && data.slug !== existing.slug) {
      const clash = await prisma.menuCategory.findUnique({ where: { slug: data.slug } });
      if (clash && clash.id !== id) {
        data.slug = `${data.slug}-${Date.now().toString(36).slice(-4)}`;
      }
    }

    const category = await prisma.menuCategory.update({
      where: { id },
      data,
      include: {
        items: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] },
      },
    });

    return jsonOk({ category: serializeMenuCategory(category), message: "Categoría actualizada." });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    await requireSession();
    const { id } = await params;
    const existing = await prisma.menuCategory.findUnique({ where: { id } });
    if (!existing) {
      return jsonError("Categoría no encontrada.", 404);
    }

    await prisma.menuCategory.delete({ where: { id } });
    return jsonOk({ message: "Categoría eliminada." });
  } catch (error) {
    return handleApiError(error);
  }
}
