import { NextRequest } from "next/server";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-response";
import { requireSession } from "@/lib/auth";
import { serializeExperience } from "@/lib/experiences";
import { createExperienceSchema } from "@/lib/experience-validations";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireSession();
    const experiences = await prisma.experience.findMany({
      include: { partner: true },
      orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { title: "asc" }],
    });
    return jsonOk({ experiences: experiences.map(serializeExperience) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireSession();
    const body = await request.json();
    const parsed = createExperienceSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Datos de experiencia inválidos.", 400, parsed.error.flatten());
    }

    const partner = await prisma.tourPartner.findUnique({ where: { id: parsed.data.partnerId } });
    if (!partner) return jsonError("El partner no existe.", 404);

    const maxSort = await prisma.experience.aggregate({
      where: { partnerId: parsed.data.partnerId },
      _max: { sortOrder: true },
    });

    const experience = await prisma.experience.create({
      data: {
        partnerId: parsed.data.partnerId,
        title: parsed.data.title.trim(),
        description: parsed.data.description?.trim() || null,
        category: parsed.data.category ?? "OTHER",
        duration: parsed.data.duration?.trim() || null,
        priceFrom: parsed.data.priceFrom ?? null,
        imageUrl: parsed.data.imageUrl?.trim() || null,
        featured: parsed.data.featured ?? false,
        active: parsed.data.active ?? true,
        sortOrder: parsed.data.sortOrder ?? (maxSort._max.sortOrder ?? -1) + 1,
      },
      include: { partner: true },
    });

    return jsonOk(
      { experience: serializeExperience(experience), message: "Experiencia creada." },
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}
