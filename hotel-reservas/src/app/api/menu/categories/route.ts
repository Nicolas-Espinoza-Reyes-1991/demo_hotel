import { NextRequest } from "next/server";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-response";
import { requireSession } from "@/lib/auth";
import { serializeMenuCategory, slugifyMenuLabel } from "@/lib/menu";
import { createMenuCategorySchema } from "@/lib/menu-validations";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * GET /api/menu/categories — listado admin (todas las categorías + ítems).
 */
export async function GET() {
  try {
    await requireSession();
    const categories = await prisma.menuCategory.findMany({
      include: {
        items: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return jsonOk({
      categories: categories.map(serializeMenuCategory),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/menu/categories — crea categoría.
 */
export async function POST(request: NextRequest) {
  try {
    await requireSession();
    const body = await request.json();
    const parsed = createMenuCategorySchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Datos de categoría inválidos.", 400, parsed.error.flatten());
    }

    const name = parsed.data.name.trim();
    let slug = parsed.data.slug?.trim() || slugifyMenuLabel(name);

    const existing = await prisma.menuCategory.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
    }

    const maxSort = await prisma.menuCategory.aggregate({ _max: { sortOrder: true } });
    const sortOrder = parsed.data.sortOrder ?? (maxSort._max.sortOrder ?? -1) + 1;

    const category = await prisma.menuCategory.create({
      data: {
        name,
        slug,
        sortOrder,
        active: parsed.data.active ?? true,
      },
      include: { items: true },
    });

    return jsonOk(
      { category: serializeMenuCategory(category), message: "Categoría creada." },
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}
