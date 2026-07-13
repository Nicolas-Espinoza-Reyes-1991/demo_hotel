import { z } from "zod";

const experienceCategoryEnum = z.enum([
  "RIDING",
  "BOAT",
  "TREKKING",
  "THERMAL",
  "FISHING",
  "CULTURE",
  "OTHER",
]);

export const createTourPartnerSchema = z.object({
  name: z.string().trim().min(2, "Nombre muy corto.").max(120),
  description: z.string().trim().max(800).optional().nullable(),
  whatsapp: z.string().trim().max(30).optional().nullable(),
  phone: z.string().trim().max(30).optional().nullable(),
  website: z.string().trim().max(300).optional().nullable(),
  area: z.string().trim().max(120).optional().nullable(),
  logoUrl: z.string().trim().max(500).optional().nullable(),
  active: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
});

export const updateTourPartnerSchema = createTourPartnerSchema.partial();

export const createExperienceSchema = z.object({
  partnerId: z.string().min(1),
  title: z.string().trim().min(2, "Título muy corto.").max(140),
  description: z.string().trim().max(1200).optional().nullable(),
  category: experienceCategoryEnum.optional(),
  duration: z.string().trim().max(80).optional().nullable(),
  priceFrom: z.coerce.number().finite().min(0).max(50_000_000).optional().nullable(),
  imageUrl: z.string().trim().max(500).optional().nullable(),
  featured: z.boolean().optional(),
  active: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
});

export const updateExperienceSchema = createExperienceSchema.partial().extend({
  partnerId: z.string().min(1).optional(),
  title: z.string().trim().min(2).max(140).optional(),
});
