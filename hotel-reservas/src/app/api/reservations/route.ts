import { NextRequest } from "next/server";
import { PaymentStatus, ReservationStatus } from "@prisma/client";
import { z } from "zod";
import { generateUniqueConfirmationCode } from "@/lib/confirmation-code";
import { checkRoomAvailability } from "@/lib/availability";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-response";
import { toDateOnly } from "@/lib/dates";
import { sendReservationCreatedEmail, buildReservationEmailPayload } from "@/lib/email";
import prisma from "@/lib/prisma";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import {
  computeHoldExpiresAt,
  expireStaleHoldReservations,
  findActiveGuestHold,
} from "@/lib/reservation-holds";
import { reservationScopeWhere } from "@/lib/reservation-history";
import { createReservationSchema } from "@/lib/validations";

const reservationQuerySchema = z
  .object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    q: z.string().trim().max(120).optional(),
    scope: z.enum(["active", "history", "all"]).optional().default("active"),
    page: z.coerce.number().int().min(1).optional().default(1),
    pageSize: z.coerce.number().int().min(1).max(100).optional().default(10),
  })
  .refine((data) => (data.from && data.to) || (!data.from && !data.to), {
    message: "Usá from y to juntos, o ninguno.",
    path: ["to"],
  })
  .refine((data) => !data.from || !data.to || data.to > data.from, {
    message: "to debe ser posterior a from.",
    path: ["to"],
  });

/**
 * GET /api/reservations
 * Lista reservas (admin). Query: ?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = reservationQuerySchema.safeParse({
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      q: searchParams.get("q") ?? undefined,
      scope: searchParams.get("scope") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
    });

    if (!parsed.success) {
      return jsonError("Filtros de reserva inválidos.", 400, parsed.error.flatten());
    }

    const { from, to, q, scope, page, pageSize } = parsed.data;

    const where = {
      ...reservationScopeWhere(scope),
      ...(from && to
        ? {
            checkIn: { lt: toDateOnly(to) },
            checkOut: { gt: toDateOnly(from) },
          }
        : {}),
      ...(q
        ? {
            OR: [
              { confirmationCode: { contains: q, mode: "insensitive" as const } },
              { guestFullName: { contains: q, mode: "insensitive" as const } },
              { guest: { email: { contains: q, mode: "insensitive" as const } } },
              { guest: { phone: { contains: q, mode: "insensitive" as const } } },
              { guest: { rut: { contains: q, mode: "insensitive" as const } } },
              { room: { code: { contains: q, mode: "insensitive" as const } } },
              { room: { name: { contains: q, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const [total, reservations] = await Promise.all([
      prisma.reservation.count({ where }),
      prisma.reservation.findMany({
        where,
        include: {
          room: { select: { code: true, name: true, type: true } },
          guest: true,
        },
        orderBy: scope === "history" ? { updatedAt: "desc" } : { checkIn: "asc" },
        skip,
        take,
      }),
    ]);

    return jsonOk({
      scope,
      count: reservations.length,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      reservations: reservations.map((r) => ({
        ...r,
        pricePerNight: Number(r.pricePerNight),
        totalAmount: Number(r.totalAmount),
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/reservations
 * Crea reserva con validación de concurrencia en transacción serializable.
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const limited = rateLimit(`reservations:${ip}`, 10, 60_000);
    if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

    await expireStaleHoldReservations();

    const body = await request.json();
    const parsed = createReservationSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Datos de reserva inválidos.", 400, parsed.error.flatten());
    }

    const { roomId, checkIn, checkOut, guestsCount, guest, specialRequests } = parsed.data;
    const checkInDate = toDateOnly(checkIn);
    const checkOutDate = toDateOnly(checkOut);

    const result = await prisma.$transaction(
      async (tx) => {
        const room = await tx.room.findUnique({ where: { id: roomId } });
        if (!room) {
          throw new Error("Habitación no encontrada.");
        }

        if (guestsCount > room.maxGuests) {
          throw new Error(`Esta habitación admite máximo ${room.maxGuests} huéspedes.`);
        }

        const existingHold = await findActiveGuestHold(tx, {
          roomId,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          guestEmail: guest.email,
        });

        const birthDate = toDateOnly(guest.birthDate);

        const guestRecord = await tx.guest.upsert({
          where: { email: guest.email },
          create: {
            fullName: guest.fullName,
            email: guest.email,
            phone: guest.phone,
            documentType: guest.documentType,
            rut: guest.documentType === "RUT" ? guest.rut : null,
            passport: guest.documentType === "PASSPORT" ? guest.passport : null,
            birthDate,
          },
          update: {
            fullName: guest.fullName.trim(),
            phone: guest.phone,
            documentType: guest.documentType,
            birthDate,
            ...(guest.documentType === "RUT"
              ? { rut: guest.rut ?? null, passport: null }
              : { passport: guest.passport ?? null, rut: null }),
          },
        });

        if (existingHold) {
          const resumed = await tx.reservation.update({
            where: { id: existingHold.id },
            data: {
              guestId: guestRecord.id,
              guestFullName: guest.fullName.trim(),
              guestDocumentType: guest.documentType,
              guestRut: guest.documentType === "RUT" ? guest.rut ?? null : null,
              guestPassport: guest.documentType === "PASSPORT" ? guest.passport ?? null : null,
              guestBirthDate: birthDate,
              guestsCount,
              specialRequests,
              expiresAt: computeHoldExpiresAt(),
            },
            include: { room: true, guest: true },
          });
          return { reservation: resumed, resumed: true as const };
        }

        const availability = await checkRoomAvailability(
          roomId,
          checkInDate,
          checkOutDate,
          undefined,
          tx
        );

        if (!availability.available) {
          const conflict = availability.conflicts[0];
          throw new Error(conflict?.message ?? "Habitación no disponible para esas fechas.");
        }

        const confirmationCode = await generateUniqueConfirmationCode(tx, checkIn);

        const created = await tx.reservation.create({
          data: {
            confirmationCode,
            roomId,
            guestId: guestRecord.id,
            guestFullName: guest.fullName.trim(),
            guestDocumentType: guest.documentType,
            guestRut: guest.documentType === "RUT" ? guest.rut ?? null : null,
            guestPassport: guest.documentType === "PASSPORT" ? guest.passport ?? null : null,
            guestBirthDate: birthDate,
            checkIn: checkInDate,
            checkOut: checkOutDate,
            nights: availability.nights,
            guestsCount,
            pricePerNight: room.pricePerNight,
            totalAmount: availability.totalAmount,
            paymentStatus: PaymentStatus.PENDING,
            status: ReservationStatus.CONFIRMED,
            specialRequests,
            expiresAt: computeHoldExpiresAt(),
          },
          include: {
            room: true,
            guest: true,
          },
        });
        return { reservation: created, resumed: false as const };
      },
      {
        isolationLevel: "Serializable",
        maxWait: 5000,
        timeout: 10000,
      }
    );

    const { reservation, resumed } = result;

    if (!resumed) {
      void sendReservationCreatedEmail(buildReservationEmailPayload(reservation));
    }

    return jsonOk(
      {
        message: resumed
          ? "Retomamos tu reserva pendiente. Completa el pago para confirmar."
          : "Reserva creada. Completa el pago para confirmar.",
        resumed,
        reservation: {
          ...reservation,
          pricePerNight: Number(reservation.pricePerNight),
          totalAmount: Number(reservation.totalAmount),
        },
      },
      resumed ? 200 : 201
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("no disponible")) {
      return jsonError(error.message, 409, undefined, "NOT_AVAILABLE");
    }
    if (error instanceof Error && error.message.includes("huéspedes")) {
      return jsonError(error.message, 400);
    }
    return handleApiError(error);
  }
}
