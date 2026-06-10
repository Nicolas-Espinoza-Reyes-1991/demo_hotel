import { z } from "zod";
import {
  isValidBirthDate,
  isValidChileanPhone,
  isValidChileanRut,
  isValidPassport,
  normalizeChileanPhone,
  normalizePassport,
  normalizeRut,
  type GuestDocumentType,
} from "./guest-identity";

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateOnly(value: string): boolean {
  if (!dateOnlyPattern.test(value)) return false;
  const date = new Date(`${value}T12:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function todayDateOnly(): string {
  return new Date().toISOString().slice(0, 10);
}

const dateOnlySchema = z
  .string()
  .regex(dateOnlyPattern, "La fecha debe ser YYYY-MM-DD")
  .refine(isValidDateOnly, "Fecha inválida");

/** Esquema de búsqueda de disponibilidad (query params). */
export const availabilityQuerySchema = z
  .object({
    checkIn: dateOnlySchema,
    checkOut: dateOnlySchema,
    guests: z.coerce.number().int().min(1).max(10).optional().default(1),
    type: z.enum(["STANDARD", "SUPERIOR", "DELUXE", "SUITE", "FAMILY"]).optional(),
  })
  .refine((data) => data.checkIn >= todayDateOnly(), {
    message: "La fecha de entrada no puede ser anterior a hoy.",
    path: ["checkIn"],
  })
  .refine((data) => data.checkOut > data.checkIn, {
    message: "La fecha de salida debe ser posterior al check-in.",
    path: ["checkOut"],
  });

export const guestDocumentTypeSchema = z.enum(["RUT", "PASSPORT"]);

export const bookingGuestSchema = z
  .object({
    fullName: z.string().trim().min(2, "Nombre demasiado corto").max(120),
    email: z.string().trim().email("Email inválido"),
    phone: z
      .string()
      .trim()
      .min(8, "Teléfono demasiado corto")
      .max(30)
      .refine(isValidChileanPhone, "Ingresá un móvil chileno válido (+56 9 XXXX XXXX)."),
    documentType: guestDocumentTypeSchema.default("RUT"),
    rut: z.string().trim().max(15).optional(),
    passport: z.string().trim().max(20).optional(),
    birthDate: dateOnlySchema,
  })
  .superRefine((guest, ctx) => {
    if (!isValidBirthDate(guest.birthDate)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Fecha de nacimiento inválida.",
        path: ["birthDate"],
      });
    }

    if (guest.documentType === "RUT") {
      if (!guest.rut?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El RUT es obligatorio.",
          path: ["rut"],
        });
      } else if (!isValidChileanRut(guest.rut)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "RUT inválido. Verificá el dígito verificador.",
          path: ["rut"],
        });
      }
    } else if (!guest.passport?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El número de pasaporte es obligatorio.",
        path: ["passport"],
      });
    } else if (!isValidPassport(guest.passport)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Pasaporte inválido (5 a 20 caracteres alfanuméricos).",
        path: ["passport"],
      });
    }
  })
  .transform((guest) => ({
    ...guest,
    phone: normalizeChileanPhone(guest.phone),
    rut: guest.documentType === "RUT" && guest.rut ? normalizeRut(guest.rut) : undefined,
    passport:
      guest.documentType === "PASSPORT" && guest.passport
        ? normalizePassport(guest.passport)
        : undefined,
    documentType: guest.documentType as GuestDocumentType,
  }));

/** Esquema para crear una reserva desde el cliente (sin datos de tarjeta). */
export const createReservationSchema = z
  .object({
    roomId: z.string().min(1),
    checkIn: dateOnlySchema,
    checkOut: dateOnlySchema,
    guestsCount: z.number().int().min(1).max(10).default(1),
    guest: bookingGuestSchema,
    specialRequests: z.string().trim().max(500).optional(),
  })
  .refine((data) => data.checkIn >= todayDateOnly(), {
    message: "La fecha de entrada no puede ser anterior a hoy.",
    path: ["checkIn"],
  })
  .refine((data) => data.checkOut > data.checkIn, {
    message: "La fecha de salida debe ser posterior al check-in.",
    path: ["checkOut"],
  });

/** Actualización manual admin — reserva. */
export const updateReservationSchema = z.object({
  paymentStatus: z.enum(["PENDING", "PAID", "CANCELLED", "REFUNDED"]).optional(),
  status: z
    .enum(["CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED", "NO_SHOW"])
    .optional(),
});

/** Actualización manual admin — habitación (estado legacy). */
export const updateRoomStatusSchema = z.object({
  status: z.enum(["AVAILABLE", "MAINTENANCE", "BLOCKED"]),
});

/** Crear habitación — admin. */
export const createRoomSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "El código es obligatorio.")
    .max(20)
    .regex(/^[A-Za-z0-9-]+$/, "Usá letras, números o guiones."),
  name: z.string().trim().min(2, "Nombre demasiado corto.").max(120),
  type: z.enum(["STANDARD", "SUPERIOR", "DELUXE", "SUITE", "FAMILY"]),
  description: z.string().trim().max(500).optional().nullable(),
  bedType: z.string().trim().max(120).optional().nullable(),
  bathroomDetail: z.string().trim().max(120).optional().nullable(),
  pricePerNight: z.coerce.number().positive("El precio debe ser mayor a 0.").max(99999),
  maxGuests: z.coerce.number().int().min(1).max(20),
  floor: z.coerce.number().int().min(0).max(200).optional().nullable(),
  status: z.enum(["AVAILABLE", "MAINTENANCE", "BLOCKED"]).optional().default("AVAILABLE"),
  imageUrl: z
    .string()
    .trim()
    .max(500)
    .optional()
    .nullable()
    .refine((value) => !value || /^https?:\/\/.+/i.test(value) || value.startsWith("/"), {
      message: "URL de imagen inválida.",
    }),
  beds: z
    .array(
      z.object({
        size: z.enum(["SINGLE", "DOUBLE", "KING"]),
        count: z.coerce.number().int().min(1).max(3),
      })
    )
    .max(3)
    .optional()
    .default([]),
  bathrooms: z
    .array(
      z.object({
        type: z.enum(["PRIVATE", "SHARED"]),
        count: z.coerce.number().int().min(1).max(3),
      })
    )
    .max(3)
    .optional()
    .default([]),
  amenities: z.array(z.string().trim().min(1).max(80)).max(20).optional().default([]),
});

/** Editar habitación — admin. */
export const updateRoomAdminSchema = createRoomSchema.partial();

/** @deprecated Usar updateRoomStatusSchema o updateRoomAdminSchema */
export const updateRoomSchema = updateRoomStatusSchema;

const mercadoPagoFormSchema = z.object({
  token: z.string().min(1),
  payment_method_id: z.string().min(1),
  transaction_amount: z.number().positive(),
  installments: z.number().int().min(1).max(24),
  issuer_id: z.union([z.string(), z.number()]).optional(),
  payer: z.object({
    email: z.string().email(),
    identification: z
      .object({
        type: z.string(),
        number: z.string(),
      })
      .optional(),
  }),
});

const simulatedPaymentSchema = z.object({
  cardHolder: z.string().min(2).max(80),
  cardNumber: z.string().min(13).max(19),
  expiry: z.string().regex(/^\d{2}\/\d{2}$/),
  cvv: z.string().min(3).max(4),
});

/** Pago desde cliente — Mercado Pago, transferencia o simulado (demo). */
export const processPaymentSchema = z.discriminatedUnion("provider", [
  z.object({
    provider: z.literal("mercadopago"),
    formData: mercadoPagoFormSchema,
  }),
  z.object({
    provider: z.literal("simulated"),
    payment: simulatedPaymentSchema,
  }),
  z.object({
    provider: z.literal("bank_transfer"),
  }),
]);

/** Esquema para consulta del calendario admin. */
export const calendarQuerySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

/** Formulario de contacto público (landing). */
export const contactFormSchema = z.object({
  name: z.string().trim().min(2, "Nombre demasiado corto").max(120),
  email: z.string().trim().email("Email inválido"),
  phone: z
    .union([z.string().trim().min(6, "Teléfono demasiado corto").max(30), z.literal("")])
    .optional()
    .transform((value) => (value ? value : undefined)),
  subject: z.enum(["reserva", "consulta", "eventos", "otro"]).optional().default("consulta"),
  message: z.string().trim().min(10, "El mensaje es demasiado corto").max(2000),
  website: z.string().optional(),
});

export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;
export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type CalendarQuery = z.infer<typeof calendarQuerySchema>;
export type ProcessPaymentInput = z.infer<typeof processPaymentSchema>;
export type ContactFormInput = z.infer<typeof contactFormSchema>;
