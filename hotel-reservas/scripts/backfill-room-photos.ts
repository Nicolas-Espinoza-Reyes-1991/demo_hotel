/**
 * Backfill NO destructivo de `photos` y `treeName` en habitaciones existentes.
 *
 * Rellena solo lo que está vacío:
 *   - photos:   si la habitación no tiene fotos en la BD, copia la galería por código.
 *   - treeName: si es null, copia el nombre de árbol por código.
 *
 * No borra ni bloquea habitaciones, no toca reservas. Es idempotente: correrlo
 * varias veces no cambia nada una vez relleno. Seguro para ejecutar en cada deploy.
 *
 * Uso local:
 *   cd hotel-reservas
 *   npx tsx scripts/backfill-room-photos.ts
 *
 * Uso en VPS:
 *   docker compose exec app npx tsx scripts/backfill-room-photos.ts
 */
import { PrismaClient } from "@prisma/client";
import { getPhotosForRoom, getTreeNameForRoom } from "../src/lib/room-gallery";

const prisma = new PrismaClient();

async function main() {
  const rooms = await prisma.room.findMany({
    select: { id: true, code: true, name: true, photos: true, treeName: true, imageUrl: true },
  });

  let updated = 0;

  for (const room of rooms) {
    const hasPhotos = Array.isArray(room.photos) && room.photos.length > 0;
    const hasTreeName = typeof room.treeName === "string" && room.treeName.trim().length > 0;

    const data: { photos?: string[]; treeName?: string } = {};

    if (!hasPhotos) {
      const gallery = getPhotosForRoom(room.code);
      const photos = gallery.length > 0 ? gallery : room.imageUrl ? [room.imageUrl] : [];
      if (photos.length > 0) data.photos = photos;
    }

    if (!hasTreeName) {
      const treeName = getTreeNameForRoom(room.code);
      if (treeName) data.treeName = treeName;
    }

    if (Object.keys(data).length === 0) continue;

    await prisma.room.update({ where: { id: room.id }, data });
    updated++;
    console.log(
      `OK hab. ${room.code} - ${room.name}` +
        (data.photos ? ` (+${data.photos.length} fotos)` : "") +
        (data.treeName ? ` (árbol: ${data.treeName})` : "")
    );
  }

  console.log(`\nBackfill terminado. ${updated}/${rooms.length} habitaciones actualizadas.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
