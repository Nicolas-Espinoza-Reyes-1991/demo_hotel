/**
 * Script one-time: actualiza nombres de habitaciones con nombres de árbol
 * y elimina habitaciones sin galería (más de 7).
 *
 * Uso local:
 *   cd hotel-reservas
 *   npx tsx scripts/update-room-data.ts
 *
 * Uso en VPS (dentro del contenedor):
 *   docker compose exec app npx tsx scripts/update-room-data.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Nombres definitivos por número de habitación (de los nombres de carpeta). */
const TREE_NAMES: Record<number, string> = {
  1: "Canelo",
  2: "Laurel",
  3: "Mañío",
  4: "Roble",
  5: "Raulí",
  6: "Ulmo",
  7: "Alerce",
};

async function main() {
  const rooms = await prisma.room.findMany({ orderBy: { code: "asc" } });

  console.log(`\nHabitaciones encontradas: ${rooms.length}\n`);

  for (const room of rooms) {
    const num = parseInt(room.code.replace(/\D/g, ""), 10);

    if (!TREE_NAMES[num]) {
      // Habitación sin galería → eliminar
      await prisma.room.delete({ where: { id: room.id } });
      console.log(`❌  Eliminada: hab. ${room.code} (${room.name}) — sin galería asignada`);
      continue;
    }

    const newName = TREE_NAMES[num];
    if (room.name !== newName) {
      await prisma.room.update({
        where: { id: room.id },
        data: { name: newName },
      });
      console.log(`✅  Actualizada: hab. ${room.code} "${room.name}" → "${newName}"`);
    } else {
      console.log(`—   Sin cambio:  hab. ${room.code} ya es "${newName}"`);
    }
  }

  console.log("\nListo.\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
