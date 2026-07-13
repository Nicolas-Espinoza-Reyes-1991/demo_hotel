import type { MenuCategory, MenuItem, Prisma } from "@prisma/client";

export type PublicMenuItem = {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  tags: string[];
  available: boolean;
  featured: boolean;
  sortOrder: number;
  active: boolean;
};

export type PublicMenuCategory = {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  active: boolean;
  items: PublicMenuItem[];
};

export function slugifyMenuLabel(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "categoria";
}

export function parseMenuTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((tag): tag is string => typeof tag === "string")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 12);
  }
  // Prisma / JSON a veces entrega string suelto o CSV
  if (typeof value === "string" && value.trim()) {
    const trimmed = value.trim();
    if (trimmed.startsWith("[")) {
      try {
        return parseMenuTags(JSON.parse(trimmed));
      } catch {
        /* fall through */
      }
    }
    return trimmed
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 12);
  }
  return [];
}

export function serializeMenuItem(item: MenuItem): PublicMenuItem {
  return {
    id: item.id,
    categoryId: item.categoryId,
    name: item.name,
    description: item.description,
    price: Number(item.price),
    imageUrl: item.imageUrl,
    tags: parseMenuTags(item.tags),
    available: item.available,
    featured: item.featured,
    sortOrder: item.sortOrder,
    active: item.active,
  };
}

export function serializeMenuCategory(
  category: MenuCategory & { items?: MenuItem[] }
): PublicMenuCategory {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    sortOrder: category.sortOrder,
    active: category.active,
    items: (category.items ?? []).map(serializeMenuItem),
  };
}

export type MenuCategoryCreateInput = {
  name: string;
  slug?: string;
  sortOrder?: number;
  active?: boolean;
};

export type MenuItemCreateInput = {
  categoryId: string;
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  tags?: string[];
  available?: boolean;
  featured?: boolean;
  sortOrder?: number;
  active?: boolean;
};

export function toMenuItemCreateData(
  input: MenuItemCreateInput
): Prisma.MenuItemUncheckedCreateInput {
  return {
    categoryId: input.categoryId,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    price: input.price,
    imageUrl: input.imageUrl?.trim() || null,
    tags: parseMenuTags(input.tags ?? []),
    available: input.available ?? true,
    featured: input.featured ?? false,
    sortOrder: input.sortOrder ?? 0,
    active: input.active ?? true,
  };
}
