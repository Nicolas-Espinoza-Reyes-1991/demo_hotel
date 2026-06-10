import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const updates = [
  { email: "maria@example.com", rut: "12.345.678-9" },
  { email: "nicolas.1991espinoza@gmail.com", rut: null },
];

try {
  for (const item of updates) {
    if (!item.rut) continue;
    const result = await prisma.guest.updateMany({
      where: { email: item.email },
      data: { rut: item.rut },
    });
    console.log(`${item.email}: ${result.count} actualizado(s)`);
  }
} catch (error) {
  console.error("ERR:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
