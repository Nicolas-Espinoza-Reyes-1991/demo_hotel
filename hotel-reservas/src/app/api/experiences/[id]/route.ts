import { NextRequest } from "next/server";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-response";
import { requireSession } from "@/lib/auth";
import { serializeExperience } from "@/lib/experiences";
import { updateExperienceSchema } from "@/lib/experience-validations";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    await requireSession();
    const { id } = await params;
    const body = await request.json();
    const parsed = updateExperienceSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Datos de experiencia inválidos.", 400, parsed.error.flatten());
    }

    const existing = await prisma.experience.findUnique({ where: { id } });
    if (!existing) return jsonError("Experiencia no encontrada.", 404);

    if (parsed.data.partnerId) {
      const partner = await prisma.tourPartner.findUnique({ where: { id: parsed.data.partnerId } });
      if (!partner) return jsonError("El partner no existe.", 404);
    }

    const experience = await prisma.experience.update({
      where: { id },
      data: {
        ...(parsed.data.partnerId !== undefined ? { partnerId: parsed.data.partnerId } : {}),
        ...(parsed.data.title !== undefined ? { title: parsed.data.title.trim() } : {}),
        ...(parsed.data.description !== undefined
          ? { description: parsed.data.description?.trim() || null }
          : {}),
        ...(parsed.data.category !== undefined ? { category: parsed.data.category } : {}),
        ...(parsed.data.duration !== undefined
          ? { duration: parsed.data.duration?.trim() || null }
          : {}),
        ...(parsed.data.priceFrom !== undefined ? { priceFrom: parsed.data.priceFrom } : {}),
        ...(parsed.data.imageUrl !== undefined
          ? { imageUrl: parsed.data.imageUrl?.trim() || null }
          : {}),
        ...(parsed.data.featured !== undefined ? { featured: parsed.data.featured } : {}),
        ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {}),
        ...(parsed.data.sortOrder !== undefined ? { sortOrder: parsed.data.sortOrder } : {}),
      },
      include: { partner: true },
    });

    return jsonOk({
      experience: serializeExperience(experience),
      message: "Experiencia actualizada.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    await requireSession();
    const { id } = await params;
    const existing = await prisma.experience.findUnique({ where: { id } });
    if (!existing) return jsonError("Experiencia no encontrada.", 404);
    await prisma.experience.delete({ where: { id } });
    return jsonOk({ message: "Experiencia eliminada." });
  } catch (error) {
    return handleApiError(error);
  }
}
