import {
  PaymentStatus,
  PrismaClient,
  ReservationStatus,
  RoomStatus,
  RoomType,
} from "@prisma/client";
import { buildConfirmationCode } from "../src/lib/confirmation-code";

const prisma = new PrismaClient();

const ROOMS = [
  {
    code: "101",
    name: "Habitación Coihue",
    type: RoomType.STANDARD,
    pricePerNight: 89,
    maxGuests: 2,
    floor: 1,
    bedType: "Cama Queen",
    bathroomDetail: "Baño privado",
    beds: [{ size: "DOUBLE", count: 1 }],
    bathrooms: [{ type: "PRIVATE", count: 1 }],
    imageUrl: "/boye-fotos/ba8ee39b02658535.jpg",
    amenities: ["WiFi", "A/C", "TV", "Baño privado"],
  },
  {
    code: "102",
    name: "Habitación Arrayán",
    type: RoomType.STANDARD,
    pricePerNight: 95,
    maxGuests: 2,
    floor: 1,
    bedType: "Cama Queen",
    bathroomDetail: "Baño privado",
    beds: [{ size: "DOUBLE", count: 1 }],
    bathrooms: [{ type: "PRIVATE", count: 1 }],
    imageUrl: "/boye-fotos/hotel-boye-house-futrono-20231007174912018200.jpg",
    amenities: ["WiFi", "A/C", "TV", "Escritorio"],
  },
  {
    code: "201",
    name: "Habitación Ulmo",
    type: RoomType.SUPERIOR,
    pricePerNight: 129,
    maxGuests: 2,
    floor: 2,
    bedType: "Cama King",
    bathroomDetail: "Baño privado",
    beds: [{ size: "KING", count: 1 }],
    bathrooms: [{ type: "PRIVATE", count: 1 }],
    imageUrl: "/boye-fotos/hotel.jpg",
    amenities: ["WiFi", "A/C", "Minibar", "Balcón"],
  },
  {
    code: "202",
    name: "Habitación Raulí",
    type: RoomType.SUPERIOR,
    pricePerNight: 125,
    maxGuests: 2,
    floor: 2,
    bedType: "2 Camas Twin",
    bathroomDetail: "Baño privado",
    beds: [{ size: "SINGLE", count: 2 }],
    bathrooms: [{ type: "PRIVATE", count: 1 }],
    imageUrl: "/boye-fotos/hotel3.jpg",
    amenities: ["WiFi", "A/C", "Caja fuerte", "Balcón"],
  },
  {
    code: "301",
    name: "Habitación Lenga",
    type: RoomType.DELUXE,
    pricePerNight: 179,
    maxGuests: 3,
    floor: 3,
    bedType: "King + Sofá cama",
    bathroomDetail: "Baño privado",
    beds: [{ size: "KING", count: 1 }, { size: "SINGLE", count: 1 }],
    bathrooms: [{ type: "PRIVATE", count: 1 }],
    imageUrl: "/boye-fotos/D_NQ_NP_698934-MLC110858871989_042026-O-hotel-boutique-frente-al-lago-ranco-futrono.webp",
    amenities: ["WiFi", "A/C", "Minibar", "Vista mar", "Jacuzzi"],
  },
  {
    code: "302",
    name: "Habitación Alerce",
    type: RoomType.DELUXE,
    pricePerNight: 189,
    maxGuests: 2,
    floor: 3,
    status: RoomStatus.AVAILABLE,
    bedType: "King",
    bathroomDetail: "Baño privado",
    beds: [{ size: "KING", count: 1 }],
    bathrooms: [{ type: "PRIVATE", count: 1 }],
    imageUrl: "/boye-fotos/hotel-boye-house-futrono-20231007174904880100.jpg",
    amenities: ["WiFi", "A/C", "Escritorio XL", "Cafetera"],
  },
  {
    code: "401",
    name: "Habitación Canelo",
    type: RoomType.SUITE,
    pricePerNight: 289,
    maxGuests: 4,
    floor: 4,
    bedType: "King + Living",
    bathroomDetail: "Baño privado con tina",
    beds: [{ size: "KING", count: 1 }, { size: "DOUBLE", count: 1 }],
    bathrooms: [{ type: "PRIVATE", count: 2 }],
    imageUrl: "/boye-fotos/D_NQ_NP_681730-MLC110858871999_042026-O-hotel-boutique-frente-al-lago-ranco-futrono.webp",
    amenities: ["WiFi", "Sala living", "Minibar premium", "Terraza"],
  },
  {
    code: "402",
    name: "Habitación Maitén",
    type: RoomType.FAMILY,
    pricePerNight: 249,
    maxGuests: 5,
    floor: 4,
    bedType: "2 camas + sofá cama",
    bathroomDetail: "Baño familiar",
    beds: [{ size: "DOUBLE", count: 1 }, { size: "SINGLE", count: 2 }],
    bathrooms: [{ type: "PRIVATE", count: 1 }, { type: "SHARED", count: 1 }],
    imageUrl: "/boye-fotos/51068992_143137900025069_8274135151487746048_n.jpg",
    amenities: ["WiFi", "2 habitaciones", "Cocina básica", "Sofá cama"],
  },
  {
    code: "501",
    name: "Habitación Coigüe de Magallanes",
    type: RoomType.SUITE,
    pricePerNight: 349,
    maxGuests: 4,
    floor: 5,
    bedType: "King premium",
    bathroomDetail: "Baño privado panorámico",
    beds: [{ size: "KING", count: 1 }],
    bathrooms: [{ type: "PRIVATE", count: 2 }],
    imageUrl: "/boye-fotos/getlstd-property-photo.jpg",
    amenities: ["WiFi", "Terraza privada", "Bar", "Vista 360°"],
  },
];

async function main() {
  console.log("🌱 Seeding hotel inventory...");

  await prisma.reservation.deleteMany();
  await prisma.guest.deleteMany();
  await prisma.roomBlock.deleteMany();
  await prisma.room.deleteMany();

  for (const room of ROOMS) {
    await prisma.room.create({ data: room });
  }

  // Reserva de ejemplo para demostrar el calendario admin
  const suite = await prisma.room.findUnique({ where: { code: "401" } });
  if (suite) {
    const guest = await prisma.guest.create({
      data: {
        fullName: "María González",
        email: "maria@example.com",
        phone: "+56911123456",
        documentType: "RUT",
        rut: "12.345.678-9",
        birthDate: new Date("1990-05-15T12:00:00.000Z"),
      },
    });

    const today = new Date();
    const checkIn = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3);
    const checkOut = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 6);

    const checkInStr = checkIn.toISOString().slice(0, 10);

    await prisma.reservation.create({
      data: {
        confirmationCode: buildConfirmationCode(checkInStr),
        roomId: suite.id,
        guestId: guest.id,
        guestFullName: guest.fullName,
        guestDocumentType: guest.documentType,
        guestRut: guest.rut,
        guestBirthDate: guest.birthDate,
        checkIn,
        checkOut,
        nights: 3,
        guestsCount: 2,
        pricePerNight: suite.pricePerNight,
        totalAmount: Number(suite.pricePerNight) * 3,
        paymentStatus: PaymentStatus.PAID,
        status: ReservationStatus.CONFIRMED,
      },
    });
  }

  // Habitación en mantenimiento
  await prisma.room.update({
    where: { code: "102" },
    data: { status: RoomStatus.MAINTENANCE },
  });

  console.log(`✅ ${ROOMS.length} habitaciones creadas`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
