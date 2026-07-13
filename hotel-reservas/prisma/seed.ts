/**
 * Seed SOLO para desarrollo / demos locales.
 * NUNCA ejecutar en producción: borra reservas y carga datos ficticios.
 *
 * Uso:
 *   ALLOW_DEMO_SEED=true npm run db:seed
 *   npm run db:seed:demo
 */
import {
  PaymentStatus,
  PrismaClient,
  ReservationStatus,
} from "@prisma/client";
import { buildEjemploRooms } from "./rooms-ejemplo";

const prisma = new PrismaClient();

function assertDemoSeedAllowed() {
  const nodeEnv = process.env.NODE_ENV?.trim().toLowerCase();
  const allow = process.env.ALLOW_DEMO_SEED?.trim().toLowerCase() === "true";
  const databaseUrl = process.env.DATABASE_URL ?? "";

  // Candado absoluto: nunca en production.
  if (nodeEnv === "production") {
    throw new Error(
      "[seed] BLOQUEADO: NODE_ENV=production. Este seed es solo para desarrollo y borra datos."
    );
  }

  const looksLikeRemoteProd =
    /lacasonadefutrono/i.test(databaseUrl) ||
    /178\.104\.214\.147/.test(databaseUrl) ||
    (/@db:5432\//i.test(databaseUrl) && !/localhost|127\.0\.0\.1/i.test(databaseUrl));

  if (looksLikeRemoteProd) {
    throw new Error(
      "[seed] BLOQUEADO: DATABASE_URL parece de producción/VPS. Abortado."
    );
  }

  const isLocalDb = /localhost|127\.0\.0\.1/i.test(databaseUrl);
  if (!isLocalDb && !allow) {
    throw new Error(
      "[seed] BLOQUEADO: BD no local. Para demos locales usá localhost y ALLOW_DEMO_SEED=true."
    );
  }

  if (!allow && isLocalDb) {
    console.warn(
      "[seed] AVISO: corriendo en BD local sin ALLOW_DEMO_SEED. Preferí: npm run db:seed:demo"
    );
  }

  console.log("[seed] Entorno permitido (desarrollo/demo).");
}

function dateOnlyUtc(daysFromToday: number): Date {
  const d = new Date();
  d.setUTCHours(12, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + daysFromToday);
  return d;
}

async function main() {
  assertDemoSeedAllowed();

  console.log("🌱 Seed demo: habitaciones + reservas ficticias…");

  await prisma.reservation.deleteMany();
  await prisma.guest.deleteMany();
  await prisma.roomBlock.deleteMany();
  await prisma.room.deleteMany();

  const roomsData = buildEjemploRooms();
  const rooms = [];
  for (const room of roomsData) {
    rooms.push(await prisma.room.create({ data: room }));
  }
  console.log(`✅ ${rooms.length} habitaciones demo`);

  const guests = await Promise.all([
    prisma.guest.create({
      data: {
        fullName: "Ana Pérez Demo",
        email: "ana.demo@example.com",
        phone: "+56911111111",
        documentType: "RUT",
        rut: "11.111.111-1",
      },
    }),
    prisma.guest.create({
      data: {
        fullName: "Bruno Soto Demo",
        email: "bruno.demo@example.com",
        phone: "+56922222222",
        documentType: "RUT",
        rut: "22.222.222-2",
      },
    }),
    prisma.guest.create({
      data: {
        fullName: "Carla Núñez Demo",
        email: "carla.demo@example.com",
        phone: "+56933333333",
        documentType: "PASSPORT",
        passport: "P1234567",
      },
    }),
    prisma.guest.create({
      data: {
        fullName: "Diego Rojas Demo",
        email: "diego.demo@example.com",
        phone: "+56944444444",
        documentType: "RUT",
        rut: "14.444.444-4",
      },
    }),
  ]);
  console.log(`✅ ${guests.length} huéspedes ficticios`);

  const [room1, room2, room3, room4] = rooms;
  const [ana, bruno, carla, diego] = guests;

  const scenarios = [
    {
      label: "PAID",
      guest: ana,
      room: room1,
      checkInOffset: 2,
      nights: 2,
      paymentStatus: PaymentStatus.PAID,
      paymentProvider: "BANK_TRANSFER" as const,
      amountPaidRatio: 1,
      expiresAt: null as Date | null,
    },
    {
      label: "PARTIAL",
      guest: bruno,
      room: room2,
      checkInOffset: 5,
      nights: 3,
      paymentStatus: PaymentStatus.PARTIAL,
      paymentProvider: "BANK_TRANSFER" as const,
      amountPaidRatio: 0.5,
      expiresAt: null as Date | null,
    },
    {
      label: "PENDING",
      guest: carla,
      room: room3,
      checkInOffset: 8,
      nights: 2,
      paymentStatus: PaymentStatus.PENDING,
      paymentProvider: "BANK_TRANSFER" as const,
      amountPaidRatio: 0,
      expiresAt: new Date(Date.now() + 36 * 60 * 60 * 1000),
    },
    {
      label: "PENDING hold corto",
      guest: diego,
      room: room4,
      checkInOffset: 12,
      nights: 1,
      paymentStatus: PaymentStatus.PENDING,
      paymentProvider: "SIMULATED" as const,
      amountPaidRatio: 0,
      expiresAt: new Date(Date.now() + 25 * 60 * 1000),
    },
  ];

  for (const scenario of scenarios) {
    const checkIn = dateOnlyUtc(scenario.checkInOffset);
    const checkOut = dateOnlyUtc(scenario.checkInOffset + scenario.nights);
    const pricePerNight = Number(scenario.room.pricePerNight);
    const totalAmount = pricePerNight * scenario.nights;
    const amountPaid = Math.round(totalAmount * scenario.amountPaidRatio * 100) / 100;

    await prisma.reservation.create({
      data: {
        roomId: scenario.room.id,
        guestId: scenario.guest.id,
        guestFullName: scenario.guest.fullName,
        guestDocumentType: scenario.guest.documentType,
        guestRut: scenario.guest.rut,
        guestPassport: scenario.guest.passport,
        checkIn,
        checkOut,
        nights: scenario.nights,
        guestsCount: 2,
        pricePerNight,
        listTotalAmount: totalAmount,
        totalAmount,
        amountPaid,
        paymentStatus: scenario.paymentStatus,
        status: ReservationStatus.CONFIRMED,
        paymentProvider: scenario.paymentProvider,
        expiresAt: scenario.expiresAt,
        specialRequests: `DEMO · ${scenario.label} — no usar en producción`,
        confirmationCode: `DEMO-${scenario.label.slice(0, 6).toUpperCase()}-${scenario.room.code}`,
      },
    });
    console.log(`  · Reserva ${scenario.label} → hab. ${scenario.room.code}`);
  }

  console.log("✅ Seed demo listo. Revisá Calendario / Reservas en el admin.");

  await prisma.menuItem.deleteMany();
  await prisma.menuCategory.deleteMany();

  const desayunos = await prisma.menuCategory.create({
    data: { name: "Desayunos", slug: "desayunos", sortOrder: 0 },
  });
  const platos = await prisma.menuCategory.create({
    data: { name: "Platos", slug: "platos", sortOrder: 1 },
  });
  const bar = await prisma.menuCategory.create({
    data: { name: "Bar", slug: "bar", sortOrder: 2 },
  });

  await prisma.menuItem.createMany({
    data: [
      {
        categoryId: desayunos.id,
        name: "Desayuno continental",
        description: "Pan amasado, mermelada, café o té y jugo natural.",
        price: 8500,
        tags: ["vegetariano"],
        featured: true,
        sortOrder: 0,
      },
      {
        categoryId: desayunos.id,
        name: "Huevos revueltos",
        description: "Con tostadas y palta de la zona.",
        price: 7500,
        tags: [],
        sortOrder: 1,
      },
      {
        categoryId: platos.id,
        name: "Trucha a la plancha",
        description: "Pescado local con ensalada y papas.",
        price: 14500,
        tags: [],
        featured: true,
        sortOrder: 0,
      },
      {
        categoryId: platos.id,
        name: "Tabla de quesos",
        description: "Selección regional para compartir.",
        price: 12000,
        tags: ["vegetariano"],
        sortOrder: 1,
      },
      {
        categoryId: bar.id,
        name: "Pisco sour",
        description: "Clásico chileno.",
        price: 6500,
        tags: [],
        sortOrder: 0,
      },
      {
        categoryId: bar.id,
        name: "Cerveza artesanal",
        description: "Botella 330 ml.",
        price: 4500,
        tags: [],
        sortOrder: 1,
      },
    ],
  });
  console.log("✅ Carta demo: 3 categorías y 6 productos.");
  console.log("⚠️  Estos datos son ficticios. No corras este seed en producción.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
