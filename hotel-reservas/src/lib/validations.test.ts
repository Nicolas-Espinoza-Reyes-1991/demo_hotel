import { describe, expect, it } from "vitest";
import {
  availabilityQuerySchema,
  calendarQuerySchema,
  createReservationSchema,
  processPaymentSchema,
  updateReservationSchema,
} from "./validations";
import { futureDateOnly } from "@/test/dates-fixtures";

const VALID_CHECK_IN = futureDateOnly(3);
const VALID_CHECK_OUT = futureDateOnly(6);

const validGuest = {
  fullName: "María González",
  email: "maria@example.com",
  phone: "+56 9 1234 5678",
  documentType: "RUT" as const,
  rut: "12.345.678-5",
  birthDate: "1990-03-20",
};

describe("createReservationSchema", () => {
  // Happy path: payload mínimo válido para crear reserva.
  it("acepta datos válidos de reserva", () => {
    const result = createReservationSchema.safeParse({
      roomId: "room-101",
      checkIn: VALID_CHECK_IN,
      checkOut: VALID_CHECK_OUT,
      guestsCount: 2,
      guest: validGuest,
    });

    expect(result.success).toBe(true);
  });

  // Zod: campos obligatorios faltantes deben fallar.
  it("rechaza payload sin roomId ni huésped", () => {
    const result = createReservationSchema.safeParse({
      checkIn: VALID_CHECK_IN,
      checkOut: VALID_CHECK_OUT,
    });

    expect(result.success).toBe(false);
  });

  // Edge case: check-out anterior al check-in.
  it("rechaza check-out anterior o igual al check-in", () => {
    const result = createReservationSchema.safeParse({
      roomId: "room-101",
      checkIn: VALID_CHECK_OUT,
      checkOut: VALID_CHECK_IN,
      guest: validGuest,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors).toBeDefined();
    }
  });

  // Zod: email con formato inválido.
  it("rechaza email de huésped inválido", () => {
    const result = createReservationSchema.safeParse({
      roomId: "room-101",
      checkIn: VALID_CHECK_IN,
      checkOut: VALID_CHECK_OUT,
      guest: { ...validGuest, email: "no-es-email" },
    });

    expect(result.success).toBe(false);
  });

  // Zod: nombre demasiado corto.
  it("rechaza nombre de huésped demasiado corto", () => {
    const result = createReservationSchema.safeParse({
      roomId: "room-101",
      checkIn: VALID_CHECK_IN,
      checkOut: VALID_CHECK_OUT,
      guest: { ...validGuest, fullName: "A" },
    });

    expect(result.success).toBe(false);
  });

  // Regla de negocio: check-in no puede ser en el pasado.
  it("rechaza check-in anterior a hoy", () => {
    const result = createReservationSchema.safeParse({
      roomId: "room-101",
      checkIn: "2020-01-01",
      checkOut: "2020-01-05",
      guest: validGuest,
    });

    expect(result.success).toBe(false);
  });

  // Zod: fecha con formato incorrecto.
  it("rechaza fechas que no cumplen patrón YYYY-MM-DD", () => {
    const result = createReservationSchema.safeParse({
      roomId: "room-101",
      checkIn: "03/06/2026",
      checkOut: VALID_CHECK_OUT,
      guest: validGuest,
    });

    expect(result.success).toBe(false);
  });
});

describe("availabilityQuerySchema", () => {
  // Happy path: query de búsqueda con huéspedes por defecto.
  it("acepta parámetros de búsqueda válidos", () => {
    const result = availabilityQuerySchema.safeParse({
      checkIn: VALID_CHECK_IN,
      checkOut: VALID_CHECK_OUT,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.guests).toBe(1);
    }
  });

  // Zod: guests fuera de rango (max 10).
  it("rechaza cantidad de huéspedes fuera de rango", () => {
    const result = availabilityQuerySchema.safeParse({
      checkIn: VALID_CHECK_IN,
      checkOut: VALID_CHECK_OUT,
      guests: 99,
    });

    expect(result.success).toBe(false);
  });

  // Edge case: fechas invertidas en query.
  it("rechaza check-out anterior al check-in en query", () => {
    const result = availabilityQuerySchema.safeParse({
      checkIn: VALID_CHECK_OUT,
      checkOut: VALID_CHECK_IN,
    });

    expect(result.success).toBe(false);
  });
});

describe("processPaymentSchema", () => {
  const mercadoPagoBase = {
    provider: "mercadopago" as const,
    formData: {
      token: "tok_test",
      payment_method_id: "visa",
      transaction_amount: 300,
      installments: 1,
      payer: { email: "payer@example.com" },
    },
  };

  // Happy path: payload Mercado Pago completo.
  it("acepta pago Mercado Pago válido", () => {
    const result = processPaymentSchema.safeParse(mercadoPagoBase);
    expect(result.success).toBe(true);
  });

  // Edge case: payload Mercado Pago sin token (incompleto).
  it("rechaza payload Mercado Pago sin token", () => {
    const result = processPaymentSchema.safeParse({
      provider: "mercadopago",
      formData: {
        payment_method_id: "visa",
        transaction_amount: 300,
        installments: 1,
        payer: { email: "payer@example.com" },
      },
    });

    expect(result.success).toBe(false);
  });

  // Happy path: transferencia bancaria solo requiere provider.
  it("acepta provider bank_transfer sin formData adicional", () => {
    const result = processPaymentSchema.safeParse({ provider: "bank_transfer" });
    expect(result.success).toBe(true);
  });

  // Happy path: pago simulado demo con tarjeta.
  it("acepta pago simulado con datos de tarjeta", () => {
    const result = processPaymentSchema.safeParse({
      provider: "simulated",
      payment: {
        cardHolder: "Test User",
        cardNumber: "4111111111111111",
        expiry: "12/30",
        cvv: "123",
      },
    });

    expect(result.success).toBe(true);
  });

  // Zod: provider desconocido en discriminated union.
  it("rechaza provider desconocido", () => {
    const result = processPaymentSchema.safeParse({
      provider: "stripe",
      formData: {},
    });

    expect(result.success).toBe(false);
  });
});

describe("updateReservationSchema", () => {
  // Happy path: actualización parcial de estado admin.
  it("acepta actualización parcial de estado y pago", () => {
    const result = updateReservationSchema.safeParse({
      paymentStatus: "PAID",
      status: "CHECKED_IN",
    });

    expect(result.success).toBe(true);
  });

  // Zod: enum inválido en paymentStatus.
  it("rechaza paymentStatus fuera del enum", () => {
    const result = updateReservationSchema.safeParse({
      paymentStatus: "INVALID",
    });

    expect(result.success).toBe(false);
  });
});

describe("calendarQuerySchema", () => {
  // Happy path: año y mes válidos para calendario admin.
  it("acepta año y mes válidos", () => {
    const result = calendarQuerySchema.safeParse({ year: 2026, month: 6 });
    expect(result.success).toBe(true);
  });

  // Zod: mes fuera de rango 1-12.
  it("rechaza mes fuera de rango", () => {
    const result = calendarQuerySchema.safeParse({ year: 2026, month: 13 });
    expect(result.success).toBe(false);
  });
});
