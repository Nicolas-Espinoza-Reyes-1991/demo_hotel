import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const result = await prisma.$executeRaw`
  UPDATE reservations r
  SET "guestRut" = g.rut
  FROM guests g
  WHERE r."guestId" = g.id
    AND r."guestRut" IS NULL
    AND g.rut IS NOT NULL
`;

console.log(`Reservas actualizadas con RUT del perfil: ${result}`);
await prisma.$disconnect();
