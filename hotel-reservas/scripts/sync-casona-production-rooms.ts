/**
 * Sincroniza producción con las 7 habitaciones oficiales de La Casona.
 *
 * Uso local:
 *   cd hotel-reservas
 *   npx tsx scripts/sync-casona-production-rooms.ts
 *
 * Uso en VPS:
 *   cd /var/www/demo_hotel/hotel-reservas
 *   docker compose exec app npx tsx scripts/sync-casona-production-rooms.ts
 */

import { PrismaClient, RoomStatus, RoomType } from "@prisma/client";
import { getPhotosForRoom, getTreeNameForRoom } from "../src/lib/room-gallery";

const prisma = new PrismaClient();

const officialRooms = [
  {
    code: "01",
    name: "Canelo",
    type: RoomType.STANDARD,
    description: "Habitación Canelo de La Casona de Futrono.",
    bedType: "Cama Queen",
    bathroomDetail: "Baño privado",
    beds: [{ size: "DOUBLE", count: 1 }],
    bathrooms: [{ type: "PRIVATE", count: 1 }],
    pricePerNight: "65000",
    maxGuests: 2,
    floor: 1,
    imageUrl: "/habitaciones/habitacion_1_canelo/1.webp",
    amenities: ["WiFi", "A/C", "TV", "Baño privado"],
  },
  {
    code: "02",
    name: "Laurel",
    type: RoomType.STANDARD,
    description: "Habitación Laurel de La Casona de Futrono.",
    bedType: "Cama Queen",
    bathroomDetail: "Baño privado",
    beds: [{ size: "DOUBLE", count: 1 }],
    bathrooms: [{ type: "PRIVATE", count: 1 }],
    pricePerNight: "65000",
    maxGuests: 2,
    floor: 1,
    imageUrl: "/habitaciones/habitacion_2_laurel/1.webp",
    amenities: ["WiFi", "A/C", "TV", "Baño privado"],
  },
  {
    code: "03",
    name: "Mañío",
    type: RoomType.STANDARD,
    description: "Habitación Mañío de La Casona de Futrono.",
    bedType: "Cama Queen",
    bathroomDetail: "Baño privado",
    beds: [{ size: "DOUBLE", count: 1 }],
    bathrooms: [{ type: "PRIVATE", count: 1 }],
    pricePerNight: "65000",
    maxGuests: 2,
    floor: 2,
    imageUrl: "/habitaciones/habitacion_3_mañio/1.webp",
    amenities: ["WiFi", "A/C", "TV", "Baño privado"],
  },
  {
    code: "04",
    name: "Roble",
    type: RoomType.STANDARD,
    description: "Habitación Roble de La Casona de Futrono.",
    bedType: "Cama Queen",
    bathroomDetail: "Baño privado",
    beds: [{ size: "DOUBLE", count: 1 }],
    bathrooms: [{ type: "PRIVATE", count: 1 }],
    pricePerNight: "65000",
    maxGuests: 2,
    floor: 2,
    imageUrl: "/habitaciones/habitacion_4_roble/1.webp",
    amenities: ["WiFi", "A/C", "TV", "Baño privado"],
  },
  {
    code: "05",
    name: "Raulí",
    type: RoomType.SUPERIOR,
    description: "Habitación Raulí de La Casona de Futrono.",
    bedType: "Cama Queen",
    bathroomDetail: "Baño privado",
    beds: [{ size: "DOUBLE", count: 1 }],
    bathrooms: [{ type: "PRIVATE", count: 1 }],
    pricePerNight: "65000",
    maxGuests: 2,
    floor: 3,
    imageUrl: "/habitaciones/habitacion_5_rauli/1.webp",
    amenities: ["WiFi", "A/C", "TV", "Baño privado"],
  },
  {
    code: "06",
    name: "Ulmo",
    type: RoomType.SUPERIOR,
    description: "Habitación Ulmo de La Casona de Futrono.",
    bedType: "Cama Queen",
    bathroomDetail: "Baño privado",
    beds: [{ size: "DOUBLE", count: 1 }],
    bathrooms: [{ type: "PRIVATE", count: 1 }],
    pricePerNight: "65000",
    maxGuests: 2,
    floor: 3,
    imageUrl: "/habitaciones/habitacion_6_ulmo/1.webp",
    amenities: ["WiFi", "A/C", "TV", "Baño privado"],
  },
  {
    code: "07",
    name: "Alerce",
    type: RoomType.DELUXE,
    description: "Habitación Alerce de La Casona de Futrono.",
    bedType: "Cama King",
    bathroomDetail: "Baño privado",
    beds: [{ size: "KING", count: 1 }],
    bathrooms: [{ type: "PRIVATE", count: 1 }],
    pricePerNight: "65000",
    maxGuests: 3,
    floor: 4,
    imageUrl: "/habitaciones/habitacion_7_alerce/1.webp",
    amenities: ["WiFi", "A/C", "TV", "Baño privado"],
  },
] as const;

const officialCodes = new Set(officialRooms.map((room) => room.code));

async function main() {
  console.log("\nSincronizando habitaciones oficiales de La Casona...\n");

  for (const room of officialRooms) {
    // Galería completa (multi-foto) + nombre de árbol desde el mapeo por código.
    // Así la landing (que lee room.photos de la API) muestra el carrusel completo.
    const galleryPhotos = getPhotosForRoom(room.code);
    const photos = galleryPhotos.length > 0 ? galleryPhotos : [room.imageUrl];
    const treeName = getTreeNameForRoom(room.code);

    const data = {
      ...room,
      photos,
      treeName,
      status: RoomStatus.AVAILABLE,
    };

    await prisma.room.upsert({
      where: { code: room.code },
      update: data,
      create: data,
    });

    console.log(`OK hab. ${room.code} - ${room.name} (${photos.length} fotos)`);
  }

  const extras = await prisma.room.findMany({
    where: { code: { notIn: Array.from(officialCodes) } },
    select: { id: true, code: true, name: true },
  });

  for (const extra of extras) {
    try {
      await prisma.room.delete({ where: { id: extra.id } });
      console.log(`Eliminada habitación extra ${extra.code} - ${extra.name}`);
    } catch {
      await prisma.room.update({
        where: { id: extra.id },
        data: { status: RoomStatus.BLOCKED },
      });
      console.log(`Bloqueada habitación extra ${extra.code} - ${extra.name} (tiene historial asociado)`);
    }
  }

  const finalRooms = await prisma.room.findMany({
    orderBy: [{ floor: "asc" }, { code: "asc" }],
    select: { code: true, name: true, type: true, status: true, pricePerNight: true },
  });

  console.log("\nEstado final:");
  console.table(finalRooms.map((room) => ({
    code: room.code,
    name: room.name,
    type: room.type,
    status: room.status,
    price: String(room.pricePerNight),
  })));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
