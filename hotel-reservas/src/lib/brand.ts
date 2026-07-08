import { hotelConfig } from "@/config/hotel";

/** Identidad visual y nombre comercial del establecimiento (desde hotel.config.json). */
export const HOTEL_NAME = hotelConfig.brand.name;
export const HOTEL_TAGLINE = hotelConfig.brand.tagline;
export const LOGO_PATH = "/logo-casona.webp";

export function getHotelName(): string {
  return process.env.HOTEL_NAME?.trim() || HOTEL_NAME;
}
