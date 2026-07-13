import type { Experience, TourPartner } from "@prisma/client";

export const EXPERIENCE_CATEGORIES = [
  "RIDING",
  "BOAT",
  "TREKKING",
  "THERMAL",
  "FISHING",
  "CULTURE",
  "OTHER",
] as const;

export type ExperienceCategory = (typeof EXPERIENCE_CATEGORIES)[number];

export const EXPERIENCE_CATEGORY_LABEL: Record<ExperienceCategory, string> = {
  RIDING: "Cabalgatas",
  BOAT: "Navegación",
  TREKKING: "Trekking",
  THERMAL: "Termas",
  FISHING: "Pesca",
  CULTURE: "Cultura",
  OTHER: "Otras",
};

export type PublicTourPartner = {
  id: string;
  name: string;
  description: string | null;
  whatsapp: string | null;
  phone: string | null;
  website: string | null;
  area: string | null;
  logoUrl: string | null;
  active: boolean;
  sortOrder: number;
};

export type PublicExperience = {
  id: string;
  partnerId: string;
  title: string;
  description: string | null;
  category: ExperienceCategory;
  categoryLabel: string;
  duration: string | null;
  priceFrom: number | null;
  imageUrl: string | null;
  featured: boolean;
  active: boolean;
  sortOrder: number;
  partner: PublicTourPartner;
};

export function serializeTourPartner(partner: TourPartner): PublicTourPartner {
  return {
    id: partner.id,
    name: partner.name,
    description: partner.description,
    whatsapp: partner.whatsapp,
    phone: partner.phone,
    website: partner.website,
    area: partner.area,
    logoUrl: partner.logoUrl,
    active: partner.active,
    sortOrder: partner.sortOrder,
  };
}

export function serializeExperience(
  experience: Experience & { partner: TourPartner }
): PublicExperience {
  return {
    id: experience.id,
    partnerId: experience.partnerId,
    title: experience.title,
    description: experience.description,
    category: experience.category,
    categoryLabel: EXPERIENCE_CATEGORY_LABEL[experience.category],
    duration: experience.duration,
    priceFrom: experience.priceFrom == null ? null : Number(experience.priceFrom),
    imageUrl: experience.imageUrl,
    featured: experience.featured,
    active: experience.active,
    sortOrder: experience.sortOrder,
    partner: serializeTourPartner(experience.partner),
  };
}

export function normalizeWhatsAppDigits(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 ? digits : null;
}
