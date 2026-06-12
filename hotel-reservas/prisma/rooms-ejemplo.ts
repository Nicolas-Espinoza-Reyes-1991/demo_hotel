import { RoomStatus, RoomType } from "@prisma/client";

/** Imágenes en public/habitaciones/ (disponibles en Docker). */
const ROOM_IMAGES = [
  "/habitaciones/WhatsApp Image 2026-06-08 at 11.07.58.jpeg",
  "/habitaciones/WhatsApp Image 2026-06-08 at 11.06.02.jpeg",
  "/habitaciones/WhatsApp Image 2026-06-08 at 11.21.10.jpeg",
  "/habitaciones/WhatsApp Image 2026-06-08 at 11.10.16.jpeg",
  "/habitaciones/WhatsApp Image 2026-06-08 at 11.09.02.jpeg",
  "/habitaciones/WhatsApp Image 2026-06-08 at 11.09.37.jpeg",
  "/habitaciones/WhatsApp Image 2026-06-08 at 11.08.49.jpeg",
  "/habitaciones/WhatsApp Image 2026-06-08 at 11.05.24.jpeg",
] as const;

/** 8 habitaciones demo: Ejemplo 1 … Ejemplo 8 (precios en CLP). */
export function buildEjemploRooms() {
  return Array.from({ length: 8 }, (_, index) => {
    const n = index + 1;
    const code = String(n).padStart(2, "0");

    return {
      code,
      name: `Ejemplo ${n}`,
      type: n <= 4 ? RoomType.STANDARD : n <= 6 ? RoomType.SUPERIOR : RoomType.DELUXE,
      description: `Habitación de demostración ${n} — Hotel Boye House.`,
      pricePerNight: 75_000 + n * 5_000,
      maxGuests: n >= 7 ? 3 : 2,
      floor: Math.ceil(n / 2),
      bedType: n >= 7 ? "Cama King" : "Cama Queen",
      bathroomDetail: "Baño privado",
      beds: [{ size: n >= 7 ? "KING" : "DOUBLE", count: 1 }],
      bathrooms: [{ type: "PRIVATE", count: 1 }],
      imageUrl: ROOM_IMAGES[index % ROOM_IMAGES.length],
      amenities: ["WiFi", "A/C", "TV", "Baño privado"],
      status: RoomStatus.AVAILABLE,
    };
  });
}
