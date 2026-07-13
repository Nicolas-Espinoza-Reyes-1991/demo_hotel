import { NextRequest } from "next/server";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-response";
import { requireSession } from "@/lib/auth";
import { normalizeWhatsAppDigits, serializeTourPartner } from "@/lib/experiences";
import { updateTourPartnerSchema } from "@/lib/experience-validations";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    await requireSession();
    const { id } = await params;
    const body = await request.json();
    const parsed = updateTourPartnerSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Datos de partner inválidos.", 400, parsed.error.flatten());
    }

    const existing = await prisma.tourPartner.findUnique({ where: { id } });
    if (!existing) return jsonError("Partner no encontrado.", 404);

    const partner = await prisma.tourPartner.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name.trim() } : {}),
        ...(parsed.data.description !== undefined
          ? { description: parsed.data.description?.trim() || null }
          : {}),
        ...(parsed.data.whatsapp !== undefined
          ? {
              whatsapp:
                normalizeWhatsAppDigits(parsed.data.whatsapp) ??
                (parsed.data.whatsapp?.trim() || null),
            }
          : {}),
        ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone?.trim() || null } : {}),
        ...(parsed.data.website !== undefined
          ? { website: parsed.data.website?.trim() || null }
          : {}),
        ...(parsed.data.area !== undefined ? { area: parsed.data.area?.trim() || null } : {}),
        ...(parsed.data.logoUrl !== undefined
          ? { logoUrl: parsed.data.logoUrl?.trim() || null }
          : {}),
        ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {}),
        ...(parsed.data.sortOrder !== undefined ? { sortOrder: parsed.data.sortOrder } : {}),
      },
    });

    return jsonOk({ partner: serializeTourPartner(partner), message: "Partner actualizado." });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    await requireSession();
    const { id } = await params;
    const existing = await prisma.tourPartner.findUnique({ where: { id } });
    if (!existing) return jsonError("Partner no encontrado.", 404);
    await prisma.tourPartner.delete({ where: { id } });
    return jsonOk({ message: "Partner eliminado." });
  } catch (error) {
    return handleApiError(error);
  }
}
