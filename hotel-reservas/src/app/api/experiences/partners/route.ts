import { NextRequest } from "next/server";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-response";
import { requireSession } from "@/lib/auth";
import { normalizeWhatsAppDigits, serializeTourPartner } from "@/lib/experiences";
import { createTourPartnerSchema } from "@/lib/experience-validations";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireSession();
    const partners = await prisma.tourPartner.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { experiences: true } } },
    });
    return jsonOk({
      partners: partners.map((p) => ({
        ...serializeTourPartner(p),
        experiencesCount: p._count.experiences,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireSession();
    const body = await request.json();
    const parsed = createTourPartnerSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Datos de partner inválidos.", 400, parsed.error.flatten());
    }

    const maxSort = await prisma.tourPartner.aggregate({ _max: { sortOrder: true } });
    const partner = await prisma.tourPartner.create({
      data: {
        name: parsed.data.name.trim(),
        description: parsed.data.description?.trim() || null,
        whatsapp: normalizeWhatsAppDigits(parsed.data.whatsapp) ?? (parsed.data.whatsapp?.trim() || null),
        phone: parsed.data.phone?.trim() || null,
        website: parsed.data.website?.trim() || null,
        area: parsed.data.area?.trim() || null,
        logoUrl: parsed.data.logoUrl?.trim() || null,
        active: parsed.data.active ?? true,
        sortOrder: parsed.data.sortOrder ?? (maxSort._max.sortOrder ?? -1) + 1,
      },
    });

    return jsonOk({ partner: serializeTourPartner(partner), message: "Partner creado." }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
