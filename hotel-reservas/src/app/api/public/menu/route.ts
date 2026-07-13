import { handleApiError, jsonOk } from "@/lib/api-response";
import { serializeMenuCategory } from "@/lib/menu";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

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
 * GET /api/public/menu
 * Carta pública: categorías activas con productos activos.
 * Los no disponibles se incluyen con available=false para mostrar “Agotado”.
 */
export async function GET() {
  try {
    const categories = await prisma.menuCategory.findMany({
      where: { active: true },
      include: {
        items: {
          where: { active: true },
          orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
        },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    const visible = categories
      .map(serializeMenuCategory)
      .filter((category) => category.items.length > 0);

    return withCorsHeaders(
      jsonOk({
        count: visible.reduce((sum, cat) => sum + cat.items.length, 0),
        categories: visible,
      })
    );
  } catch (error) {
    return withCorsHeaders(handleApiError(error));
  }
}
