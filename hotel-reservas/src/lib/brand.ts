/** Identidad visual y nombre comercial del establecimiento. */
export const HOTEL_NAME = "La Casona de Futrono";
export const HOTEL_TAGLINE = "Futrono · Reservas";
export const LOGO_PATH = "/logo-casona.webp";

export function getHotelName(): string {
  return process.env.HOTEL_NAME?.trim() || HOTEL_NAME;
}
