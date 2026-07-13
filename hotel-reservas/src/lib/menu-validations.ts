import { z } from "zod";

export const createMenuCategorySchema = z.object({
  name: z.string().trim().min(2, "Nombre muy corto.").max(80),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug inválido.")
    .optional(),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
  active: z.boolean().optional(),
});

export const updateMenuCategorySchema = createMenuCategorySchema.partial().extend({
  name: z.string().trim().min(2).max(80).optional(),
});

export const createMenuItemSchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().trim().min(2, "Nombre muy corto.").max(120),
  description: z.string().trim().max(600).optional().nullable(),
  price: z.coerce.number().finite().min(0, "Precio inválido.").max(10_000_000),
  imageUrl: z.string().trim().max(500).optional().nullable(),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
  available: z.boolean().optional(),
  featured: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
  active: z.boolean().optional(),
});

export const updateMenuItemSchema = createMenuItemSchema.partial().extend({
  categoryId: z.string().min(1).optional(),
  name: z.string().trim().min(2).max(120).optional(),
  price: z.coerce.number().finite().min(0).max(10_000_000).optional(),
});
