import { PrismaClient } from "@prisma/client";
import { buildEjemploRooms } from "./rooms-ejemplo";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Cargando 8 habitaciones Ejemplo 1–8…");

  await prisma.reservation.deleteMany();
  await prisma.guest.deleteMany();
  await prisma.roomBlock.deleteMany();
  await prisma.room.deleteMany();

  const rooms = buildEjemploRooms();

  for (const room of rooms) {
    await prisma.room.create({ data: room });
  }

  console.log(`✅ ${rooms.length} habitaciones creadas (Ejemplo 1 … Ejemplo ${rooms.length})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
