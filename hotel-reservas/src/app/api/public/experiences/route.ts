import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-response";
import { serializeExperience } from "@/lib/experiences";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

const querySchema = z.object({
  category: z
    .enum(["RIDING", "BOAT", "TREKKING", "THERMAL", "FISHING", "CULTURE", "OTHER"])
    .optional(),
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
 * GET /api/public/experiences
 * Actividades activas de partners activos.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      category: searchParams.get("category") ?? undefined,
    });
    if (!parsed.success) {
      return withCorsHeaders(jsonError("Filtro inválido.", 400, parsed.error.flatten()));
    }

    const experiences = await prisma.experience.findMany({
      where: {
        active: true,
        partner: { active: true },
        ...(parsed.data.category ? { category: parsed.data.category } : {}),
      },
      include: { partner: true },
      orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { title: "asc" }],
    });

    return withCorsHeaders(
      jsonOk({
        count: experiences.length,
        experiences: experiences.map(serializeExperience),
      })
    );
  } catch (error) {
    return withCorsHeaders(handleApiError(error));
  }
}
