import { RoomStatus, RoomType } from "@prisma/client";

const ROOM_IMAGES = [
  "/boye-fotos/ba8ee39b02658535.jpg",
  "/boye-fotos/hotel-boye-house-futrono-20231007174912018200.jpg",
  "/boye-fotos/hotel.jpg",
  "/boye-fotos/hotel3.jpg",
  "/boye-fotos/D_NQ_NP_698934-MLC110858871989_042026-O-hotel-boutique-frente-al-lago-ranco-futrono.webp",
  "/boye-fotos/hotel-boye-house-futrono-20231007174904880100.jpg",
  "/boye-fotos/D_NQ_NP_681730-MLC110858871999_042026-O-hotel-boutique-frente-al-lago-ranco-futrono.webp",
  "/boye-fotos/51068992_143137900025069_8274135151487746048_n.jpg",
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
